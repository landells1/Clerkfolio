// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildDigestSummary, isDigestEmpty, shouldSendMonthlyDigest } from '@/lib/engagement/digest'

// The auto completeness "green/amber/red mix" was removed from digests
// pre-launch (Batch 3 / F-016). What the digest still summarises is the entry
// count, the specialty tags used, and the streak.
describe('buildDigestSummary', () => {
  it('counts entries', () => {
    const summary = buildDigestSummary([
      { specialty_tags: ['imt'] },
      { specialty_tags: [] },
      {},
    ])
    expect(summary.entryCount).toBe(3)
  })

  it('collects sorted unique specialty tags', () => {
    const summary = buildDigestSummary([
      { specialty_tags: ['surgery', 'imt'] },
      { specialty_tags: ['imt'] },
    ])
    expect(summary.specialtyTags).toEqual(['imt', 'surgery'])
  })

  it('derives streak fields from active weeks', () => {
    const summary = buildDigestSummary([], [])
    expect(summary.currentStreak).toBe(0)
    expect(summary.activeWeeksYtd).toBe(0)
  })
})

// Volume-reduction gating (owner feedback: digest emails are too frequent).
describe('isDigestEmpty', () => {
  it('is empty when there are no entries', () => {
    expect(isDigestEmpty(buildDigestSummary([]))).toBe(true)
  })

  it('is not empty when there is at least one entry', () => {
    expect(isDigestEmpty(buildDigestSummary([{ specialty_tags: [] }]))).toBe(false)
  })
})

describe('shouldSendMonthlyDigest', () => {
  it('sends monthly when weekly is explicitly off and monthly is on', () => {
    expect(shouldSendMonthlyDigest({ weekly_digest: false, monthly_digest: true })).toBe(true)
  })

  it('sends monthly when weekly is off and monthly is unset (defaults on)', () => {
    expect(shouldSendMonthlyDigest({ weekly_digest: false })).toBe(true)
  })

  it('suppresses monthly when weekly is on (explicit) to avoid duplicate content', () => {
    expect(shouldSendMonthlyDigest({ weekly_digest: true, monthly_digest: true })).toBe(false)
  })

  it('suppresses monthly when weekly is unset (defaults on)', () => {
    expect(shouldSendMonthlyDigest({})).toBe(false)
  })

  it('never sends monthly when the user explicitly turned monthly off, regardless of weekly', () => {
    expect(shouldSendMonthlyDigest({ weekly_digest: false, monthly_digest: false })).toBe(false)
    expect(shouldSendMonthlyDigest({ monthly_digest: false })).toBe(false)
  })
})
