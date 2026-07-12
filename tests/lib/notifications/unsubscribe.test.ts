// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  signUnsubscribeToken,
  verifyUnsubscribeToken,
  unsubscribeUrl,
  applyUnsubscribe,
} from '@/lib/notifications/unsubscribe'

const USER = '11111111-2222-3333-4444-555555555555'

describe('unsubscribe token sign/verify', () => {
  beforeEach(() => {
    vi.stubEnv('UNSUBSCRIBE_SECRET', 'unit-test-secret')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://clerkfolio.co.uk')
  })

  it('round-trips a valid token back to userId + list', () => {
    const token = signUnsubscribeToken(USER, 'weekly_digest')!
    expect(token).toBeTruthy()
    expect(verifyUnsubscribeToken(token)).toEqual({ userId: USER, list: 'weekly_digest' })
  })

  it('rejects a token with a tampered signature', () => {
    const token = signUnsubscribeToken(USER, 'reminders')!
    const [payload] = token.split('.')
    expect(verifyUnsubscribeToken(`${payload}.deadbeef`)).toBeNull()
  })

  it('rejects a token whose payload was swapped (signature no longer matches)', () => {
    const a = signUnsubscribeToken(USER, 'weekly_digest')!
    const b = signUnsubscribeToken(USER, 'monthly_digest')!
    const forged = `${a.split('.')[0]}.${b.split('.')[1]}`
    expect(verifyUnsubscribeToken(forged)).toBeNull()
  })

  it('rejects garbage and non-strings', () => {
    expect(verifyUnsubscribeToken('')).toBeNull()
    expect(verifyUnsubscribeToken('no-dot')).toBeNull()
    expect(verifyUnsubscribeToken(null)).toBeNull()
    expect(verifyUnsubscribeToken(42)).toBeNull()
  })

  it('rejects a token signed with a different secret', () => {
    const token = signUnsubscribeToken(USER, 'all')!
    vi.stubEnv('UNSUBSCRIBE_SECRET', 'a-different-secret')
    expect(verifyUnsubscribeToken(token)).toBeNull()
  })

  it('builds an absolute confirmation URL', () => {
    const url = unsubscribeUrl(USER, 'weekly_digest')!
    expect(url.startsWith('https://clerkfolio.co.uk/unsubscribe?token=')).toBe(true)
  })

  it('falls back to SHARE_IP_HASH_SALT when no dedicated secret is set', () => {
    vi.stubEnv('UNSUBSCRIBE_SECRET', '')
    vi.stubEnv('SHARE_IP_HASH_SALT', 'salt-fallback')
    const token = signUnsubscribeToken(USER, 'reminders')!
    expect(verifyUnsubscribeToken(token)).toEqual({ userId: USER, list: 'reminders' })
  })
})

describe('applyUnsubscribe', () => {
  it('sets the single mapped key false without mutating input', () => {
    const current = { weekly_digest: true, deadlines: true }
    const next = applyUnsubscribe(current, 'weekly_digest')
    expect(next).toEqual({ weekly_digest: false, deadlines: true })
    expect(current.weekly_digest).toBe(true) // unchanged
  })

  it('turns off every reminder key for the reminders list', () => {
    const next = applyUnsubscribe({}, 'reminders')
    expect(next).toEqual({
      deadlines: false,
      share_link_expiring: false,
      application_window: false,
      activity_nudge: false,
    })
  })

  it('turns off everything for the all list', () => {
    const next = applyUnsubscribe(null, 'all')
    expect(Object.values(next).every(v => v === false)).toBe(true)
    expect(Object.keys(next)).toContain('weekly_digest')
    expect(Object.keys(next)).toContain('monthly_digest')
  })
})
