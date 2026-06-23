// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  BASE_STORAGE_MB,
  VERIFIED_BONUS_MB,
  VERIFIED_STORAGE_MB,
  PRO_STORAGE_MB,
  REFERRAL_STORAGE_BONUS_MB,
  REFERRAL_STORAGE_BONUS_AT,
  formatStorageQuota,
} from '@/lib/entitlements/limits'

// These mirror the literals baked into get_profile_entitlements (SQL). If a
// number changes, change it in BOTH places - this test is the canary.
describe('entitlement storage limits (single source of truth)', () => {
  it('uses the agreed base-ten numbers', () => {
    expect(BASE_STORAGE_MB).toBe(100)
    expect(VERIFIED_BONUS_MB).toBe(400)
    expect(VERIFIED_STORAGE_MB).toBe(500) // base + verified bonus
    expect(PRO_STORAGE_MB).toBe(5000)
    expect(REFERRAL_STORAGE_BONUS_MB).toBe(250)
    expect(REFERRAL_STORAGE_BONUS_AT).toBe(5)
  })

  it('formats the resulting quotas base-ten', () => {
    expect(formatStorageQuota(BASE_STORAGE_MB)).toBe('100 MB')
    expect(formatStorageQuota(VERIFIED_STORAGE_MB)).toBe('500 MB')
    expect(formatStorageQuota(PRO_STORAGE_MB)).toBe('5 GB')
    // verified + 5 referrals = 100 + 400 + 250
    expect(formatStorageQuota(VERIFIED_STORAGE_MB + REFERRAL_STORAGE_BONUS_MB)).toBe('750 MB')
  })
})
