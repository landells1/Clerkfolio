import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { SPECIALTY_CONFIGS } from '@/lib/specialties'
import { grantEligibleReferralReward } from '@/lib/referrals/rewards'

const CAREER_STAGES = new Set(['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y5_PLUS', 'Y6', 'FY1', 'FY2', 'POST_FY'])

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid onboarding payload.' }, { status: 400 })
  }

  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
  const careerStage = typeof body.careerStage === 'string' && CAREER_STAGES.has(body.careerStage) ? body.careerStage : null
  const studentGraduationDate =
    typeof body.studentGraduationDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.studentGraduationDate)
      ? body.studentGraduationDate
      : null
  const selectedSpecialties: string[] = Array.isArray(body.specialties)
    ? body.specialties.filter((key: unknown): key is string => typeof key === 'string').slice(0, 3)
    : []

  if (!firstName || !lastName || !careerStage) {
    return NextResponse.json({ error: 'Profile details are incomplete.' }, { status: 400 })
  }

  const isMedicalStudent = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y5_PLUS', 'Y6'].includes(careerStage)
  if (isMedicalStudent && !studentGraduationDate) {
    return NextResponse.json({ error: 'Expected graduation date is required for student accounts.' }, { status: 400 })
  }

  const specialtySet = new Set(SPECIALTY_CONFIGS.map(s => s.key))
  const validSpecialties = selectedSpecialties.filter(key => specialtySet.has(key))

  const { data: profile } = await supabase
    .from('profiles')
    .select('referred_by')
    .eq('id', user.id)
    .single()

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      career_stage: careerStage,
      student_graduation_date: studentGraduationDate,
      onboarding_complete: true,
    })
    .eq('id', user.id)

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  if (validSpecialties.length > 0) {
    // Upsert is atomic against the (user_id, specialty_key) unique constraint:
    // two concurrent onboarding completes can no longer race to double-insert.
    const appRows = validSpecialties.map(key => {
      const config = SPECIALTY_CONFIGS.find(s => s.key === key)!
      return { user_id: user.id, specialty_key: key, cycle_year: Number(config.cycleYear) || new Date().getFullYear(), bonus_claimed: false }
    })
    if (appRows.length > 0) {
      const { error } = await supabase
        .from('specialty_applications')
        .upsert(appRows, { onConflict: 'user_id,specialty_key', ignoreDuplicates: true })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Only auto-create deadlines for specialties the user did not already have tracked
    const { data: existingApps } = await supabase
      .from('specialty_applications')
      .select('specialty_key, created_at')
      .eq('user_id', user.id)
      .in('specialty_key', validSpecialties)

    // Treat any specialty whose row was created in the last 60 seconds as "newly added in this onboarding pass".
    const sixtySecondsAgo = Date.now() - 60_000
    const newSpecialties = (existingApps ?? [])
      .filter(row => new Date(row.created_at).getTime() >= sixtySecondsAgo)
      .map(row => row.specialty_key)

    const deadlineRows = newSpecialties.flatMap(key => {
      const config = SPECIALTY_CONFIGS.find(s => s.key === key)
      if (!config?.applicationWindow) return []
      return [
        { user_id: user.id, title: `${config.name} applications open`, due_date: config.applicationWindow.opensDate, completed: false, is_auto: true, source_specialty_key: key },
        { user_id: user.id, title: `${config.name} applications close`, due_date: config.applicationWindow.closesDate, completed: false, is_auto: true, source_specialty_key: key },
      ]
    })
    if (deadlineRows.length > 0) {
      // Tolerate duplicate-key races against the partial unique index
      // (user_id, source_specialty_key, title, due_date) WHERE is_auto = true.
      const { error } = await supabase.from('deadlines').insert(deadlineRows)
      if (error && error.code !== '23505') return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  if (profile?.referred_by && profile.referred_by !== user.id && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await grantEligibleReferralReward(createServiceClient(), user.id)
  }

  return NextResponse.json({ ok: true })
}
