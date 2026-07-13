import { describe, expect, it } from 'vitest'
import {
  accountLastActivityAt,
  inactiveAccountCutoff,
  isAccountInactiveForRetention,
} from '@/lib/account/inactive-user-retention'

const NOW = new Date('2026-07-13T12:00:00.000Z')

describe('inactive account retention', () => {
  it('uses the last sign-in rather than account creation', () => {
    expect(isAccountInactiveForRetention({
      created_at: '2020-01-01T00:00:00.000Z',
      last_sign_in_at: '2025-07-14T12:00:00.000Z',
    }, NOW)).toBe(false)
  })

  it('uses account creation for an account that has never signed in', () => {
    expect(isAccountInactiveForRetention({
      created_at: '2024-07-13T12:00:00.000Z',
      last_sign_in_at: null,
    }, NOW)).toBe(true)
  })

  it('does not delete accounts that are not yet two years inactive', () => {
    expect(isAccountInactiveForRetention({
      created_at: '2020-01-01T00:00:00.000Z',
      last_sign_in_at: '2024-07-13T12:00:00.001Z',
    }, NOW)).toBe(false)
  })

  it('handles the leap-day cutoff as the final day of February', () => {
    expect(inactiveAccountCutoff(new Date('2024-02-29T12:00:00.000Z')).toISOString())
      .toBe('2022-02-28T12:00:00.000Z')
  })

  it('does not consider malformed or absent activity timestamps eligible', () => {
    expect(accountLastActivityAt({ created_at: 'not-a-date' })).toBeNull()
    expect(isAccountInactiveForRetention({}, NOW)).toBe(false)
  })
})
