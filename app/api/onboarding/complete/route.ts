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
    ? body.specialties.filter((key: unknown): key is string => typeof key === 'string').slice(0, 1)
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

  // Reject if the user is already onboarded. The middleware redirects
  // completed users away from /onboarding, but a stale tab or a crafted POST
  // could still hit this route directly. Without this guard, a re-submit
  // overwrites the user's profile name and career_stage with the values in
  // whatever stale form state the browser held.
  const { data: profile, error: profileFetchError } = await supabase
    .from('profiles')
    .select('referred_by, onboarding_complete')
    .eq('id', user.id)
    .maybeSingle()

  if (profileFetchError) {
    return NextResponse.json({ error: profileFetchError.message }, { status: 500 })
  }

  // Self-heal missing profile (auth.users exists but public.profiles does
  // not - e.g. handle_new_user failure or manual cleanup). The RPC rebuilds
  // the row from auth.users metadata, mirroring handle_new_user's logic.
  if (!profile) {
    const service = createServiceClient()
    const { error: repairError } = await service.rpc('ensure_profile_for_current_user').single()
    if (repairError) {
      return NextResponse.json(
        { error: 'Could not initialise your profile. Please refresh and try again.' },
        { status: 500 }
      )
    }
  } else if (profile.onboarding_complete) {
    return NextResponse.json(
      { error: 'Onboarding already complete. Refresh your tab to see the latest dashboard.' },
      { status: 409 }
    )
  }

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
    .eq('onboarding_complete', false)
    .select('id')
    .maybeSingle()

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  const service = createServiceClient()

  // Starter notifications use the service-role client. The notifications RLS
  // posture is "users do not INSERT their own notifications" (set in the
  // 2026-05-15 audit migration). The user-bound client silently failed
  // before; surfacing failures to Sentry-style logs is the audit fix.
  const { count: existingNotifications } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((existingNotifications ?? 0) === 0) {
    const starterNotifications = [
      {
        user_id: user.id,
        type: 'application_window_open',
        title: 'Welcome to Clerkfolio',
        body: 'Your dashboard, portfolio, and timeline are ready. Add a case or portfolio entry to start building evidence.',
        link: '/dashboard',
      },
      {
        user_id: user.id,
        type: 'deadline_due',
        title: 'Track your next milestone',
        body: 'Set one goal or review your timeline deadlines so the app can start nudging you at the right time.',
        link: '/timeline',
      },
    ]
    const { error: notifInsertError } = await service.from('notifications').insert(starterNotifications)
    if (notifInsertError) {
      console.error('onboarding/complete: notifications insert failed:', notifInsertError.message)
    }
  }

  if (validSpecialties.length > 0) {
    // Upsert is atomic against the (user_id, specialty_key) unique constraint:
    // two concurrent onboarding completes can no longer race to double-insert.
    // Service-role client so the specialty-track-cap trigger bypasses (a user
    // running through onboarding is initialising their first tracker, not
    // tripping the Free cap).
    const appRows = validSpecialties.map(key => {
      const config = SPECIALTY_CONFIGS.find(s => s.key === key)!
      return { user_id: user.id, specialty_key: key, cycle_year: Number(config.cycleYear) || new Date().getFullYear(), bonus_claimed: false }
    })
    if (appRows.length > 0) {
      const { error } = await service
        .from('specialty_applications')
        .upsert(appRows, { onConflict: 'user_id,specialty_key', ignoreDuplicates: true })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Deterministic existence check: only auto-create deadlines for specialties
    // that have no deadlines yet. The previous 60-second heuristic dropped
    // deadlines when the user spent more than a minute on the page; the
    // (user_id, source_specialty_key, title, due_date) partial unique index
    // on deadlines makes duplicate inserts safe so we no longer need the
    // freshness gate.
    const { data: existingDeadlines } = await supabase
      .from('deadlines')
      .select('source_specialty_key')
      .eq('user_id', user.id)
      .eq('is_auto', true)
      .in('source_specialty_key', validSpecialties)

    const have = new Set((existingDeadlines ?? []).map(d => d.source_specialty_key))
    const need = validSpecialties.filter(key => !have.has(key))

    const deadlineRows = need.flatMap(key => {
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
    await grantEligibleReferralReward(service, user.id)
  }

  return NextResponse.json({ ok: true })
}
