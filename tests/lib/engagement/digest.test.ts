// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildDigestSummary } from '@/lib/engagement/digest'
import { completenessScore } from '@/lib/utils/completeness'

// Pins the completeness scale shared by completenessScore (the writer) and
// buildDigestSummary (the reader). The digest once used percent-style
// thresholds (>=80 green) against the stored 0-2 scale, so every entry in
// every weekly/monthly digest email was reported as red. If either side
// changes scale, one of these tests must fail.
describe('buildDigestSummary completeness buckets', () => {
  it('classifies the 0-2 completeness scale into red/amber/green', () => {
    const summary = buildDigestSummary([
      { completeness_score: 2 },
      { completeness_score: 2 },
      { completeness_score: 1 },
      { completeness_score: 0 },
      { completeness_score: null },
    ])
    expect(summary.entryCount).toBe(5)
    expect(summary.green).toBe(2)
    expect(summary.amber).toBe(1)
    expect(summary.red).toBe(2)
  })

  it('buckets every score produced by completenessScore', () => {
    const fullEntry = {
      category: 'custom',
      title: 'Departmental teaching',
      date: '2026-06-01',
      notes: 'Session notes',
      specialty_tags: ['imt'],
    }
    expect(completenessScore(fullEntry, 'portfolio')).toBe(2)

    const summary = buildDigestSummary([
      { completeness_score: completenessScore(fullEntry, 'portfolio') },
      { completeness_score: completenessScore({ ...fullEntry, specialty_tags: [] }, 'portfolio') },
      { completeness_score: completenessScore({ category: 'custom', title: 'Bare' }, 'portfolio') },
    ])
    expect(summary.green).toBe(1)
    expect(summary.amber).toBe(1)
    expect(summary.red).toBe(1)
  })

  it('collects sorted unique specialty tags', () => {
    const summary = buildDigestSummary([
      { specialty_tags: ['surgery', 'imt'] },
      { specialty_tags: ['imt'] },
    ])
    expect(summary.specialtyTags).toEqual(['imt', 'surgery'])
  })
})
