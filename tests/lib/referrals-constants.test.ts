// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  laddersEarnedAt,
  freePdfAllowance,
  freeShareAllowance,
  isFoundingSharerWindowOpen,
  REFERRAL_LADDER,
  FOUNDING_SHARER_WINDOW_END,
} from '@/lib/referrals/constants'

describe('referral ladder helpers', () => {
  it('earns ladder rungs at the right thresholds (1/3/5/10)', () => {
    expect(laddersEarnedAt(0)).toEqual([])
    expect(laddersEarnedAt(1)).toEqual(['connector'])
    expect(laddersEarnedAt(3)).toEqual(['connector', 'advocate'])
    expect(laddersEarnedAt(5)).toEqual(['connector', 'advocate', 'champion'])
    expect(laddersEarnedAt(10)).toEqual(['connector', 'advocate', 'champion', 'ambassador'])
    expect(laddersEarnedAt(100)).toEqual(REFERRAL_LADDER.map(b => b.key))
  })

  it('grants +1 PDF and +1 share per rewarded referral on top of the free base of 1', () => {
    expect(freePdfAllowance(0)).toBe(1)
    expect(freePdfAllowance(3)).toBe(4)
    expect(freeShareAllowance(0)).toBe(1)
    expect(freeShareAllowance(2)).toBe(3)
  })

  it('pins the owner-set Founding Sharer window end', () => {
    // Owner decision 2026-07-13: the founding-sharer window runs to the end
    // of 2026. If this is deliberately changed, update the pin.
    expect(FOUNDING_SHARER_WINDOW_END).toBe('2026-12-31')
  })

  it('reports the window closed after the configured end', () => {
    expect(isFoundingSharerWindowOpen(new Date('2027-01-01T12:00:00Z'))).toBe(false)
  })

  it('reports the window open for a now before the configured end', () => {
    const end = new Date(`${FOUNDING_SHARER_WINDOW_END}T00:00:00Z`)
    const before = new Date(end.getTime() - 86_400_000)
    expect(isFoundingSharerWindowOpen(before)).toBe(true)
  })
})
