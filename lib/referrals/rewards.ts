import type { SupabaseClient } from '@supabase/supabase-js'
import {
  REFERRAL_VEST_DAYS,
  REFERRAL_STORAGE_BONUS_MB,
  REFERRAL_STORAGE_BONUS_AT,
  REFERRAL_LADDER,
  laddersEarnedAt,
  isFoundingSharerWindowOpen,
  type ReferralBadgeKey,
} from '@/lib/referrals/constants'
import { createNotification, getUserEmail } from '@/lib/notifications/create'
import { transactionalEmail } from '@/lib/notifications/email-templates'

// ---------------------------------------------------------------------------
// Referral lifecycle (Batch 1, F-002 overhaul):
//   pending  -> a referred user signed up with a referrer code (attribution).
//   activated -> the referred user did the meaningful action (onboarding +
//                >=1 real case/entry) AND the referrer is institution-verified.
//   completed -> the reward vested REFERRAL_VEST_DAYS after activation; the
//                REFERRER's recognition (badges / +1 PDF / +1 share / the
//                +REFERRAL_STORAGE_BONUS_MB storage at REFERRAL_STORAGE_BONUS_AT)
//                now counts. Storage / PDF / share bonuses are derived in
//                get_profile_entitlements from the completed count; referrals
//                grant NO Pro (Pro is buy-only).
//
// Rewards accrue to the REFERRER (the sharer). The referred user's incentive is
// the product itself; the new model grants them no separate entitlement.
// Measurement is decoupled from reward: every signup is counted for attribution
// (the referral_funnel view), rewards pay only on the vested meaningful action.
// ---------------------------------------------------------------------------

type ReferredProfile = {
  id: string
  referred_by: string | null
  onboarding_complete: boolean | null
}

type VerificationFields = {
  student_email_verified: boolean | null
  student_email_verification_due_at: string | null
}

function hasCurrentInstitutionVerification(profile: VerificationFields | null) {
  if (!profile?.student_email_verified) return false
  // Null due_at treated as expired, matching recompute_profile_tier in the DB.
  if (!profile.student_email_verification_due_at) return false
  return new Date(`${profile.student_email_verification_due_at}T23:59:59.999Z`).getTime() >= Date.now()
}

// Meaningful action: onboarding complete AND at least one real (non-demo,
// non-deleted) case OR portfolio entry. Demo starter-pack rows do not count.
async function hasMeaningfulAction(service: SupabaseClient, referred: ReferredProfile) {
  if (!referred.onboarding_complete) return false
  const [{ count: caseCount }, { count: entryCount }] = await Promise.all([
    service.from('cases').select('id', { count: 'exact', head: true })
      .eq('user_id', referred.id).eq('is_demo', false).is('deleted_at', null),
    service.from('portfolio_entries').select('id', { count: 'exact', head: true })
      .eq('user_id', referred.id).eq('is_demo', false).is('deleted_at', null),
  ])
  return (caseCount ?? 0) > 0 || (entryCount ?? 0) > 0
}

async function ensurePendingReferral(service: SupabaseClient, referrerId: string, referredId: string) {
  // ignoreDuplicates so a concurrent caller cannot downgrade an already-
  // activated/completed referral row back to 'pending'.
  await service.from('referrals').upsert({
    referrer_id: referrerId,
    referred_id: referredId,
    status: 'pending',
  }, { onConflict: 'referred_id', ignoreDuplicates: true })
}

export type ActivationResult = { activated: boolean; reason: string }

// Records attribution and, if the referred user has done the meaningful action
// and the referrer is institution-verified, marks the referral 'activated' so
// it begins its vesting window. Idempotent: a row already activated/completed
// is left untouched. Does NOT grant rewards (those vest via the cron).
export async function markReferralActivationIfEligible(
  service: SupabaseClient,
  referredUserId: string,
): Promise<ActivationResult> {
  const { data: referred } = await service
    .from('profiles')
    .select('id, referred_by, onboarding_complete')
    .eq('id', referredUserId)
    .maybeSingle<ReferredProfile>()

  if (!referred?.referred_by || referred.referred_by === referredUserId) {
    return { activated: false, reason: 'no_referrer' }
  }

  await ensurePendingReferral(service, referred.referred_by, referredUserId)

  const { data: existing } = await service
    .from('referrals')
    .select('status')
    .eq('referred_id', referredUserId)
    .maybeSingle<{ status: string }>()

  if (existing?.status === 'activated' || existing?.status === 'completed') {
    return { activated: false, reason: 'already_activated' }
  }

  if (!(await hasMeaningfulAction(service, referred))) {
    return { activated: false, reason: 'referred_not_eligible' }
  }

  const { data: referrer } = await service
    .from('profiles')
    .select('student_email_verified, student_email_verification_due_at')
    .eq('id', referred.referred_by)
    .maybeSingle<VerificationFields>()

  if (!hasCurrentInstitutionVerification(referrer)) {
    return { activated: false, reason: 'referrer_not_verified' }
  }

  // Only flip rows still pending (guards against a race with another caller).
  await service.from('referrals')
    .update({ status: 'activated', activated_at: new Date().toISOString() })
    .eq('referred_id', referredUserId)
    .eq('status', 'pending')

  return { activated: true, reason: 'activated' }
}

// When a user becomes institution-verified (or re-verifies), re-check every
// person they referred: any whose meaningful action is already done can now
// activate (the referrer-verified gate just opened).
export async function processReferralsForReferrer(service: SupabaseClient, referrerUserId: string) {
  const { data: pending } = await service
    .from('referrals')
    .select('referred_id')
    .eq('referrer_id', referrerUserId)
    .eq('status', 'pending')

  const results: ActivationResult[] = []
  for (const row of pending ?? []) {
    results.push(await markReferralActivationIfEligible(service, row.referred_id as string))
  }
  return results
}

// ---------------------------------------------------------------------------
// Vesting cron entrypoint. Two phases:
//   1. Activation scan: catch referred users who did the meaningful action
//      after their onboarding-complete event (no specific call site fires then).
//   2. Vest activated referrals older than REFERRAL_VEST_DAYS: flip to
//      'completed', then award the referrer's badges and notify (storage/PDF/
//      share bonuses are derived in the RPC; no Pro is granted).
// Returns a summary for the cron response/logs.
// ---------------------------------------------------------------------------
export async function vestDueReferrals(service: SupabaseClient, now: Date = new Date()) {
  // Phase 1 - activation scan over still-pending referrals.
  const { data: stillPending } = await service
    .from('referrals')
    .select('referred_id')
    .eq('status', 'pending')
  let activatedCount = 0
  for (const row of stillPending ?? []) {
    const r = await markReferralActivationIfEligible(service, row.referred_id as string)
    if (r.activated) activatedCount += 1
  }

  // Phase 2 - vest activated referrals past the vesting window.
  const cutoff = new Date(now.getTime() - REFERRAL_VEST_DAYS * 86_400_000).toISOString()
  const { data: due } = await service
    .from('referrals')
    .select('referrer_id')
    .eq('status', 'activated')
    .lte('activated_at', cutoff)

  const referrerIds = Array.from(new Set((due ?? []).map(r => r.referrer_id as string)))
  let vestedCount = 0
  for (const referrerId of referrerIds) {
    vestedCount += await vestForReferrer(service, referrerId, cutoff, now)
  }

  return { activated: activatedCount, vestedReferrers: referrerIds.length, vested: vestedCount }
}

async function vestForReferrer(service: SupabaseClient, referrerId: string, cutoff: string, now: Date) {
  const nowIso = now.toISOString()

  // Mark this referrer's due referrals completed.
  const { data: vested } = await service
    .from('referrals')
    .update({ status: 'completed', reward_granted_at: nowIso })
    .eq('referrer_id', referrerId)
    .eq('status', 'activated')
    .lte('activated_at', cutoff)
    .select('id')
  const vestedNow = vested?.length ?? 0
  if (vestedNow === 0) return 0

  const { count } = await service
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', referrerId)
    .eq('status', 'completed')
  const newCount = count ?? 0

  const { data: referrer } = await service
    .from('profiles')
    .select('first_name, referral_badges')
    .eq('id', referrerId)
    .maybeSingle<{ first_name: string | null; referral_badges: string[] | null }>()
  if (!referrer) return vestedNow

  const prevBadges = new Set(referrer.referral_badges ?? [])

  // Badges: ladder rungs earned at the new count + the time-limited Founding
  // Sharer badge if its window is open (they just landed a rewarded referral).
  // Referrals grant NO Pro - the storage bonus (+REFERRAL_STORAGE_BONUS_MB at
  // REFERRAL_STORAGE_BONUS_AT) and the +1 PDF/+1 share are derived in the RPC,
  // so vesting only persists badges; pro_features_used is left untouched.
  const earned: ReferralBadgeKey[] = laddersEarnedAt(newCount)
  if (isFoundingSharerWindowOpen(now)) earned.push('founding_sharer')
  const newBadges = earned.filter(b => !prevBadges.has(b))
  const allBadges = Array.from(new Set([...prevBadges, ...earned]))

  await service.from('profiles').update({ referral_badges: allBadges }).eq('id', referrerId)

  // Notify the referrer: one headline (with email) + per-badge in-app rows.
  const email = await getUserEmail(service, referrerId)
  const perkLines: string[] = [
    `You now have ${newCount} rewarded referral${newCount === 1 ? '' : 's'}, each adding +1 PDF export and +1 share link.`,
  ]
  if (newCount >= REFERRAL_STORAGE_BONUS_AT) {
    perkLines.push(`You have unlocked +${REFERRAL_STORAGE_BONUS_MB} MB of permanent bonus storage.`)
  }
  for (const key of newBadges) {
    const meta = REFERRAL_LADDER.find(b => b.key === key)
    perkLines.push(meta ? `New badge: ${meta.label} ${meta.emoji}.` : 'You earned the Founding Sharer badge. 🚀')
  }

  const headlineEmail = email
    ? {
        to: email,
        subject: 'Your Clerkfolio referral reward',
        ...transactionalEmail({
          firstName: referrer.first_name,
          heading: 'A referral was rewarded 🎉',
          lines: perkLines,
          ctaLabel: 'View your referrals',
          ctaPath: '/settings/referrals',
        }),
      }
    : null

  await createNotification(service, {
    userId: referrerId,
    type: 'referral_reward',
    title: 'A referral was rewarded 🎉',
    body: perkLines[0],
    link: '/settings/referrals',
  }, headlineEmail)

  for (const key of newBadges) {
    const meta = REFERRAL_LADDER.find(b => b.key === key)
    await createNotification(service, {
      userId: referrerId,
      type: 'referral_badge',
      title: meta ? `Badge earned: ${meta.label} ${meta.emoji}` : 'Badge earned: Founding Sharer 🚀',
      body: meta ? meta.description : 'You shared Clerkfolio during launch — thank you for being an early supporter.',
      link: '/settings/referrals',
    })
  }

  return vestedNow
}
