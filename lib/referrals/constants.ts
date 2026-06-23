// Single source of truth for the referral reward ladder (Batch 1, F-002).
//
// Reward currencies, by true marginal cost:
//   * Per rewarded referral (~free, unbounded): +1 PDF export, +1 active share
//     link. These are DERIVED in get_profile_entitlements from the count of
//     vested referrals - not stored counters - so they are idempotent.
//   * Recognition badges (free): the ladder below + the time-limited
//     "Founding Sharer" launch badge.
//   * Bounded / costly: permanent +REFERRAL_STORAGE_BONUS_MB storage at
//     REFERRAL_STORAGE_BONUS_AT referrals (hard-capped, derived in the RPC).
//
// Referrals do NOT grant Pro - Pro is buy-only (Stripe). No leaderboard, no
// cash/swag (owner decision).

// Storage numbers live in one place (lib/entitlements/limits.ts); re-export
// here so existing referral-UI imports keep resolving from this module.
export { REFERRAL_STORAGE_BONUS_MB, REFERRAL_STORAGE_BONUS_AT } from '@/lib/entitlements/limits'

export type ReferralBadgeKey =
  | 'connector'
  | 'advocate'
  | 'champion'
  | 'ambassador'
  | 'founding_sharer'

export interface ReferralBadge {
  key: ReferralBadgeKey
  label: string
  /** Rewarded-referral count needed to earn this rung. */
  threshold: number
  description: string
  emoji: string
}

// The tiered ladder, ascending. Thresholds = count of REWARDED (vested)
// referrals. (Owner-chosen: 1 / 3 / 5 / 10.)
export const REFERRAL_LADDER: ReferralBadge[] = [
  { key: 'connector', label: 'Connector', threshold: 1, emoji: '🤝', description: 'Referred your first colleague to Clerkfolio.' },
  { key: 'advocate', label: 'Advocate', threshold: 3, emoji: '📣', description: 'Three colleagues joined on your recommendation.' },
  { key: 'champion', label: 'Champion', threshold: 5, emoji: '🏅', description: 'Five referrals — unlocked a permanent storage bonus.' },
  { key: 'ambassador', label: 'Ambassador', threshold: 10, emoji: '🏆', description: 'Ten colleagues onboarded on your recommendation.' },
]

// A rewarded referral grants +1 PDF and +1 active share link (unbounded),
// derived in get_profile_entitlements.
export const REFERRAL_PDF_PER = 1
export const REFERRAL_SHARE_PER = 1

// Anti-abuse: a referral's reward vests this many days after the referred user
// completes the meaningful action (onboarding + >=1 real case/entry) AND the
// referrer is institution-verified. Until vested it counts only for
// attribution, not for rewards. (Owner: vest ~7-14 days; we use 7.)
export const REFERRAL_VEST_DAYS = 7

// "Founding Sharer" launch badge: earned by anyone who lands a rewarded
// referral while this window is open (the first 8 weeks post-launch).
//
// OWNER ACTION: set this to (launch date + 8 weeks) when the launch date is
// fixed. The placeholder below is deliberately in the past so the badge is
// dormant (no one earns it) until you set a real future date — it never
// mis-fires. Format: YYYY-MM-DD (UTC end-of-day).
export const FOUNDING_SHARER_WINDOW_END = '2000-01-01'

export function isFoundingSharerWindowOpen(now: Date = new Date()): boolean {
  const end = new Date(`${FOUNDING_SHARER_WINDOW_END}T23:59:59.999Z`)
  if (Number.isNaN(end.getTime())) return false
  return now.getTime() <= end.getTime()
}

// Recognition badges earned at a given rewarded-referral count (ladder only;
// founding_sharer is granted separately on the time window).
export function laddersEarnedAt(count: number): ReferralBadgeKey[] {
  return REFERRAL_LADDER.filter(b => count >= b.threshold).map(b => b.key)
}

// PDF / share allowance for a free user with the given rewarded-referral count.
export function freePdfAllowance(referralCount: number): number {
  return 1 + REFERRAL_PDF_PER * referralCount
}
export function freeShareAllowance(referralCount: number): number {
  return 1 + REFERRAL_SHARE_PER * referralCount
}
