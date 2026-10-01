// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  countItemsPerRotation,
  formatRotationMonths,
  formatRotationSpan,
  rotationEndDate,
  rotationForDate,
  rotationSpans,
  type RotationRow,
} from '@/lib/logs/rotations'

const TODAY = '2026-10-01'

// The QA account's shape: a one-week induction inside the first block, then
// back-to-back four-month blocks, the last one ongoing.
const rows: RotationRow[] = [
  { id: 'gs', title: 'General Surgery', date: '2026-04-01', meta: { end_date: '2026-07-31', detail: 'Ward 7' } },
  { id: 'ind', title: 'Induction', date: '2026-04-01', meta: { end_date: '2026-04-07' } },
  { id: 'am', title: 'Acute Medicine', date: '2026-08-01', meta: { end_date: '2026-09-15' } },
  { id: 'el', title: 'Elective', date: '2026-09-16', meta: {} },
]

describe('rotationEndDate', () => {
  it('returns a valid stored end date', () => {
    expect(rotationEndDate({ date: '2026-04-01', meta: { end_date: '2026-07-31' } })).toBe('2026-07-31')
  })

  it('treats a missing, malformed or backwards end date as ongoing', () => {
    expect(rotationEndDate({ date: '2026-04-01', meta: null })).toBeNull()
    expect(rotationEndDate({ date: '2026-04-01', meta: { end_date: 'end of July' } })).toBeNull()
    expect(rotationEndDate({ date: '2026-04-01', meta: { end_date: '2026-03-01' } })).toBeNull()
  })

  it('never parses the free-text detail', () => {
    expect(rotationEndDate({ date: '2026-04-01', meta: { detail: 'until 2026-07-31' } })).toBeNull()
  })
})

describe('rotationSpans', () => {
  it('lists every rotation, oldest first', () => {
    expect(rotationSpans(rows).map(span => span.id)).toEqual(['gs', 'ind', 'am', 'el'])
  })
})

describe('rotationForDate', () => {
  const spans = rotationSpans(rows)

  it('gives an item inside an overlapping induction week to the induction, not the block', () => {
    expect(rotationForDate(spans, '2026-04-03', TODAY)?.id).toBe('ind')
    expect(rotationForDate(spans, '2026-04-08', TODAY)?.id).toBe('gs')
  })

  it('uses today as the end of an ongoing rotation', () => {
    expect(rotationForDate(spans, '2026-09-30', TODAY)?.id).toBe('el')
    expect(rotationForDate(spans, '2026-10-02', TODAY)).toBeNull()
  })

  it('returns null for dates outside every rotation', () => {
    expect(rotationForDate(spans, '2026-03-01', TODAY)).toBeNull()
  })

  it('prefers the most recently started rotation when an old one was never closed', () => {
    const open = rotationSpans([
      { id: 'old', title: 'Old block', date: '2026-01-01', meta: {} },
      { id: 'new', title: 'New block', date: '2026-06-01', meta: {} },
    ])
    expect(rotationForDate(open, '2026-07-01', TODAY)?.id).toBe('new')
    expect(rotationForDate(open, '2026-05-01', TODAY)?.id).toBe('old')
  })
})

describe('countItemsPerRotation', () => {
  it('counts each item once, inside its own rotation only', () => {
    const items = [
      { date: '2026-04-02' }, { date: '2026-04-05' }, // induction
      { date: '2026-05-10' }, { date: '2026-07-31' }, // general surgery
      { date: '2026-08-01' },                          // acute medicine
      { date: '2026-09-20' },                          // elective (ongoing)
      { date: '2026-03-01' }, { date: '2026-11-01' }, // outside / future
    ]
    const counts = countItemsPerRotation(rotationSpans(rows), items, TODAY)
    expect(Object.fromEntries(counts)).toEqual({ gs: 2, ind: 2, am: 1, el: 1 })
    const total = Array.from(counts.values()).reduce((sum, n) => sum + n, 0)
    expect(total).toBe(6)
  })
})

describe('formatting', () => {
  it('shows the real span with full dates', () => {
    expect(formatRotationSpan({ start: '2026-04-01', end: '2026-04-07' })).toBe('1 Apr 2026 - 7 Apr 2026')
    expect(formatRotationSpan({ start: '2026-09-16', end: null })).toBe('16 Sept 2026 - ongoing')
  })

  it('shows month-year spans for the CV', () => {
    expect(formatRotationMonths({ start: '2026-04-01', end: '2026-07-31' })).toBe('Apr 2026 - Jul 2026')
    expect(formatRotationMonths({ start: '2026-09-16', end: null })).toBe('Sept 2026 - present')
  })

  it('shows a single month for a placement that starts and ends in the same month', () => {
    expect(formatRotationMonths({ start: '2026-06-01', end: '2026-06-26' })).toBe('Jun 2026')
  })
})
