// Single source of truth for storage entitlement numbers (base-ten MB,
// 1 GB = 1000 MB). The get_profile_entitlements RPC mirrors these literals in
// SQL (see supabase/migrations/*entitlements*); keep the two in sync. All UI
// and marketing copy must COMPUTE displayed values from these constants rather
// than hardcoding strings, so a number only ever changes in one place.

/** Free baseline storage. */
export const BASE_STORAGE_MB = 100

/** Bonus for an institutionally-verified account (.ac.uk student OR NHS
 *  doctor). One per account. Verified total = BASE + this. */
export const VERIFIED_BONUS_MB = 400

/** A paid (Stripe) Pro subscription. The ONLY way to get Pro. */
export const PRO_STORAGE_MB = 5000

/** Permanent storage unlocked once a user reaches REFERRAL_STORAGE_BONUS_AT
 *  rewarded referrals. Stacks additively on whatever base the user has. */
export const REFERRAL_STORAGE_BONUS_MB = 250
export const REFERRAL_STORAGE_BONUS_AT = 5

/** Convenience: a verified (non-Pro) account's total quota. */
export const VERIFIED_STORAGE_MB = BASE_STORAGE_MB + VERIFIED_BONUS_MB

// Base-ten storage formatting (1 GB = 1000 MB). Quotas can be fractional GB
// (e.g. 5500, 5750), so trim a trailing ".0" but keep ".5"/".75". Pure helper
// so any module (incl. marketing pricing) can compute labels from the numbers
// above without pulling in entitlement-fetch code.
export function formatStorageQuota(mb: number): string {
  if (mb >= 1000) {
    const gb = mb / 1000
    return `${Number.isInteger(gb) ? gb : Number(gb.toFixed(2))} GB`
  }
  return `${Math.round(mb)} MB`
}
