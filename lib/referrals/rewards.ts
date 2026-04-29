import type { SupabaseClient } from '@supabase/supabase-js'

const REFERRAL_REWARD_DAYS = 30
const MAX_REWARDED_REFERRALS_PER_YEAR = 5

type ProfileForReward = {
  id: string
  referred_by: string | null
  onboarding_complete: boolean | null
  student_email_verified: boolean | null
  student_email_verification_due_at: string | null
  pro_features_used: Record<string, unknown> | null
}

function referralUntil(existing?: string | null) {
  const base = existing && new Date(existing).getTime() > Date.now()
    ? new Date(existing)
    : new Date()
  base.setDate(base.getDate() + REFERRAL_REWARD_DAYS)
  return base.toISOString()
}

function mergeUsage(usage: Record<string, unknown> | null, referralProUntil: string) {
  return {
    pdf_exports_used: Number(usage?.pdf_exports_used ?? 0),
    share_links_used: Number(usage?.share_links_used ?? 0),
    referral_pro_until: referralProUntil,
  }
}

function hasCurrentInstitutionVerification(profile: Pick<ProfileForReward, 'student_email_verified' | 'student_email_verification_due_at'> | null) {
  if (!profile?.student_email_verified) return false
  if (!profile.student_email_verification_due_at) return true

  return new Date(`${profile.student_email_verification_due_at}T23:59:59.999Z`).getTime() >= Date.now()
}

async function ensurePendingReferral(service: SupabaseClient, referrerId: string, referredId: string) {
  await service.from('referrals').upsert({
    referrer_id: referrerId,
    referred_id: referredId,
    status: 'pending',
  }, { onConflict: 'referred_id' })
}

export async function grantEligibleReferralReward(service: SupabaseClient, referredUserId: string) {
  const { data: referred } = await service
    .from('profiles')
    .select('id, referred_by, onboarding_complete, student_email_verified, student_email_verification_due_at, pro_features_used')
    .eq('id', referredUserId)
    .maybeSingle<ProfileForReward>()

  if (!referred?.referred_by || referred.referred_by === referredUserId) {
    return { granted: false, reason: 'no_referrer' }
  }

  const { data: existingReferral } = await service
    .from('referrals')
    .select('status')
    .eq('referred_id', referredUserId)
    .maybeSingle()

  if (existingReferral?.status === 'completed') {
    return { granted: false, reason: 'already_completed' }
  }

  await ensurePendingReferral(service, referred.referred_by, referredUserId)

  if (!referred.onboarding_complete || !hasCurrentInstitutionVerification(referred)) {
    return { granted: false, reason: 'referred_not_eligible' }
  }

  const { data: referrer } = await service
    .from('profiles')
    .select('id, student_email_verified, student_email_verification_due_at, pro_features_used')
    .eq('id', referred.referred_by)
    .maybeSingle<Pick<ProfileForReward, 'id' | 'student_email_verified' | 'student_email_verification_due_at' | 'pro_features_used'>>()

  if (!referrer || !hasCurrentInstitutionVerification(referrer)) {
    return { granted: false, reason: 'referrer_not_eligible' }
  }

  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const { count } = await service
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', referrer.id)
    .eq('status', 'completed')
    .gte('reward_granted_at', oneYearAgo.toISOString())

  if ((count ?? 0) >= MAX_REWARDED_REFERRALS_PER_YEAR) {
    return { granted: false, reason: 'referrer_cap_reached' }
  }

  const now = new Date().toISOString()
  const referredUntil = referralUntil((referred.pro_features_used?.referral_pro_until as string | null) ?? null)
  const referrerUntil = referralUntil((referrer.pro_features_used?.referral_pro_until as string | null) ?? null)

  await service.from('referrals').upsert({
    referrer_id: referrer.id,
    referred_id: referredUserId,
    status: 'completed',
    reward_granted_at: now,
  }, { onConflict: 'referred_id' })

  await Promise.all([
    service.from('profiles').update({
      pro_features_used: mergeUsage(referred.pro_features_used, referredUntil),
    }).eq('id', referredUserId),
    service.from('profiles').update({
      pro_features_used: mergeUsage(referrer.pro_features_used, referrerUntil),
    }).eq('id', referrer.id),
  ])

  return { granted: true, reason: 'granted' }
}

export async function grantPendingReferralRewardsForReferrer(service: SupabaseClient, referrerUserId: string) {
  const { data: pendingReferrals } = await service
    .from('referrals')
    .select('referred_id')
    .eq('referrer_id', referrerUserId)
    .eq('status', 'pending')

  const results = []
  for (const referral of pendingReferrals ?? []) {
    results.push(await grantEligibleReferralReward(service, referral.referred_id))
  }

  return results
}
