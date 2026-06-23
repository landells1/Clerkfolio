import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { SPECIALTY_CONFIGS } from '@/lib/specialties'
import { markReferralActivationIfEligible } from '@/lib/referrals/rewards'
import { ensureDemoStarterPack } from '@/lib/onboarding/demo-seed'
import { CAREER_STAGE_SET, isMedicalStudentStage } from '@/lib/constants/career-stages'

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid onboarding payload.' }, { status: 400 })
  }

  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
  const careerStage = typeof body.careerStage === 'string' && CAREER_STAGE_SET.has(body.careerStage) ? body.careerStage : null
  const rawGradDate = typeof body.studentGraduationDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.studentGraduationDate)
    ? body.studentGraduationDate
    : null
  // Sanity bounds: reject dates more than 2 years in the past or more than
  // 8 years in the future. Mirrors the DB CHECK constraint added in phase 4b.
  const studentGraduationDate = (() => {
    if (!rawGradDate) return null
    const d = new Date(rawGradDate)
    const now = new Date()
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate())
    const eightYearsAhead = new Date(now.getFullYear() + 8, now.getMonth(), now.getDate())
    if (d < twoYearsAgo || d > eightYearsAhead) return null
    return rawGradDate
  })()
  const selectedSpecialties: string[] = Array.isArray(body.specialties)
    ? body.specialties.filter((key: unknown): key is string => typeof key === 'string').slice(0, 1)
    : []

  if (!firstName || !lastName || !careerStage) {
    return NextResponse.json({ error: 'Profile details are incomplete.' }, { status: 400 })
  }

  const isMedicalStudent = isMedicalStudentStage(careerStage)
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
  //
  // CRITICAL: must use the user-bound client. The RPC is SECURITY DEFINER and
  // calls auth.uid() internally; the service-role client has no JWT, so
  // auth.uid() returns NULL and the RPC raises 'not_authenticated'. The phase 3
  // migration also drops the user-level INSERT policy on profiles so this RPC
  // is now the only path for the rare missing-profile case.
  if (!profile) {
    const { error: repairError } = await supabase.rpc('ensure_profile_for_current_user').single()
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

  // Service-role client is required for the profile UPDATE: the
  // guard_profile_writes trigger (phase 4 audit) intentionally reverts
  // onboarding_complete on every user-bound UPDATE to prevent self-onboarding
  // bypasses. The trigger checks both current_user and the JWT role claim and
  // only lets supabase_admin / service_role through. Using the user-bound
  // client here made the UPDATE silently lose onboarding_complete=true while
  // the route still returned ok:true, leaving every new account stuck on
  // /onboarding step 4 indefinitely.
  const service = createServiceClient()

  const { data: updatedRow, error: profileError } = await service
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

  // Two-tab race: a stale tab can hit this route after the first tab already
  // flipped onboarding_complete to true. The eq('onboarding_complete', false)
  // filter made the UPDATE a no-op; without this guard the route would still
  // run the service-role specialty/notifications block and bypass the Free
  // cap a second time.
  if (!updatedRow) {
    return NextResponse.json(
      { error: 'Onboarding already complete. Refresh your tab to see the latest dashboard.' },
      { status: 409 }
    )
  }

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

  // Seed the demo starter pack here, exactly once, now that onboarding is
  // genuinely completing (guarded by the onboarding_complete flip above). Moved
  // off the dashboard render hot-path (F-031) and made idempotent against the
  // partial unique demo indexes (F-014). Best-effort: a seed failure must never
  // block onboarding completion.
  try {
    await ensureDemoStarterPack(supabase, user.id)
  } catch (err) {
    console.error('onboarding/complete: demo seed failed:', err instanceof Error ? err.message : String(err))
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
    // Record/advance the referral. Onboarding alone may not yet meet the
    // meaningful-action bar (>=1 real case/entry); the vesting cron re-scans
    // pending referrals daily, so this is best-effort, not the only trigger.
    await markReferralActivationIfEligible(service, user.id)
  }

  // Recompute tier now that career_stage is final. Closes the
  // "NHS-verified-before-onboarding leaves tier=free" gap because the
  // auth/callback path now only writes verification fields, and this is the
  // central derivation. Service-role caller; the RPC validates internally.
  const { error: recomputeError } = await service.rpc('recompute_profile_tier', { p_user_id: user.id })
  if (recomputeError) {
    console.error('onboarding/complete: recompute_profile_tier failed:', recomputeError.message)
  }

  return NextResponse.json({ ok: true })
}
