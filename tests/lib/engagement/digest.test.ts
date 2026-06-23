// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildDigestSummary } from '@/lib/engagement/digest'

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
