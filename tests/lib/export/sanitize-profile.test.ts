// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  PROFILE_EXPORT_SECRET_COLUMNS,
  sanitizeProfileForExport,
} from '@/lib/export/sanitize-profile'

describe('sanitizeProfileForExport', () => {
  it('strips calendar_feed_token_hash and calendar_feed_token (BUG-012)', () => {
    const profile = {
      id: 'user-123',
      full_name: 'Test User',
      calendar_feed_token: 'plaintext-token',
      calendar_feed_token_hash: 'de2edd3b0000000000000000000000000000000000000000000000000000abcd',
    }
    const safe = sanitizeProfileForExport(profile)
    expect(safe).not.toHaveProperty('calendar_feed_token')
    expect(safe).not.toHaveProperty('calendar_feed_token_hash')
  })

  it('keeps all non-secret profile fields (GDPR Art. 20 completeness)', () => {
    const profile = {
      id: 'user-123',
      full_name: 'Test User',
      tier: 'free',
      stripe_customer_id: 'cus_abc',
      display_prefs: { high_contrast: true },
      calendar_feed_token_hash: 'abc',
    }
    const safe = sanitizeProfileForExport(profile)
    expect(safe).toMatchObject({
      id: 'user-123',
      full_name: 'Test User',
      tier: 'free',
      stripe_customer_id: 'cus_abc',
      display_prefs: { high_contrast: true },
    })
  })

  it('does not mutate the input object', () => {
    const profile = { id: 'u', calendar_feed_token_hash: 'abc' }
    sanitizeProfileForExport(profile)
    expect(profile.calendar_feed_token_hash).toBe('abc')
  })

  it('returns an empty object for null/undefined/non-object input', () => {
    expect(sanitizeProfileForExport(null)).toEqual({})
    expect(sanitizeProfileForExport(undefined)).toEqual({})
    expect(sanitizeProfileForExport('nope')).toEqual({})
  })

  it('denylist covers exactly the two calendar feed token columns', () => {
    expect([...PROFILE_EXPORT_SECRET_COLUMNS].sort()).toEqual([
      'calendar_feed_token',
      'calendar_feed_token_hash',
    ])
  })
})
