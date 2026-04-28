import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { SPECIALTY_CONFIGS } from '@/lib/specialties'

const CAREER_STAGES = new Set(['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'FY1', 'FY2'])

function referralUntil(existing?: string | null) {
  const base = existing && new Date(existing).getTime() > Date.now()
    ? new Date(existing)
    : new Date()
  base.setDate(base.getDate() + 30)
  return base.toISOString()
}

function mergeUsage(usage: Record<string, unknown> | null, referral_pro_until: string) {
  return {
    pdf_exports_used: Number(usage?.pdf_exports_used ?? 0),
    share_links_used: Number(usage?.share_links_used ?? 0),
    referral_pro_until,
  }
}

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = createClient()
  const service = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
  const careerStage = typeof body.careerStage === 'string' && CAREER_STAGES.has(body.careerStage) ? body.careerStage : null
  const selectedSpecialties: string[] = Array.isArray(body.specialties)
    ? body.specialties.filter((key: unknown): key is string => typeof key === 'string').slice(0, 3)
    : []

  if (!firstName || !lastName || !careerStage) {
    return NextResponse.json({ error: 'Profile details are incomplete.' }, { status: 400 })
  }

  const specialtySet = new Set(SPECIALTY_CONFIGS.map(s => s.key))
  const validSpecialties = selectedSpecialties.filter(key => specialtySet.has(key))

  const { data: profile } = await service
    .from('profiles')
    .select('referred_by, pro_features_used')
    .eq('id', user.id)
    .single()

  const { error: profileError } = await service
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      career_stage: careerStage,
      specialty_interests: validSpecialties,
      onboarding_complete: true,
    })
    .eq('id', user.id)

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  if (validSpecialties.length > 0) {
    const { data: existingApps } = await service
      .from('specialty_applications')
      .select('specialty_key')
      .eq('user_id', user.id)
      .in('specialty_key', validSpecialties)

    const existingKeys = new Set((existingApps ?? []).map(row => row.specialty_key))
    const newSpecialties = validSpecialties.filter(key => !existingKeys.has(key))

    const appRows = newSpecialties.map(key => {
      const config = SPECIALTY_CONFIGS.find(s => s.key === key)!
      return { user_id: user.id, specialty_key: key, cycle_year: Number(config.cycleYear) || new Date().getFullYear(), bonus_claimed: false }
    })
    if (appRows.length > 0) await service.from('specialty_applications').insert(appRows)

    const deadlineRows = newSpecialties.flatMap(key => {
      const config = SPECIALTY_CONFIGS.find(s => s.key === key)
      if (!config?.applicationWindow) return []
      return [
        { user_id: user.id, title: `${config.name} applications open`, due_date: config.applicationWindow.opensDate, completed: false, is_auto: true, source_specialty_key: key },
        { user_id: user.id, title: `${config.name} applications close`, due_date: config.applicationWindow.closesDate, completed: false, is_auto: true, source_specialty_key: key },
      ]
    })
    if (deadlineRows.length > 0) await service.from('deadlines').insert(deadlineRows)
  }

  if (profile?.referred_by && profile.referred_by !== user.id) {
    const now = new Date().toISOString()
    const { data: referrer } = await service
      .from('profiles')
      .select('id, pro_features_used')
      .eq('id', profile.referred_by)
      .single()

    const referredUntil = referralUntil((profile.pro_features_used as Record<string, unknown> | null)?.referral_pro_until as string | null)
    const referrerUntil = referralUntil((referrer?.pro_features_used as Record<string, unknown> | null)?.referral_pro_until as string | null)

    await service.from('referrals').upsert({
      referrer_id: profile.referred_by,
      referred_id: user.id,
      status: 'completed',
      reward_granted_at: now,
    }, { onConflict: 'referred_id' })

    await Promise.all([
      service.from('profiles').update({
        pro_features_used: mergeUsage(profile.pro_features_used as Record<string, unknown> | null, referredUntil),
      }).eq('id', user.id),
      referrer ? service.from('profiles').update({
        pro_features_used: mergeUsage(referrer.pro_features_used as Record<string, unknown> | null, referrerUntil),
      }).eq('id', profile.referred_by) : Promise.resolve(),
    ])
  }

  return NextResponse.json({ ok: true })
}
