// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { addHeading, buildPersonalLogMeta, emptyHeading, isUpcoming, logRowSummary, saveLabel } from '@/lib/logs/personal-log'

describe('wording', () => {
  it('keeps acronyms and plurals right', () => {
    expect(saveLabel('wba_received')).toBe('Save WBA')
    expect(addHeading('mentor_meeting')).toBe('Add mentor meeting')
    expect(emptyHeading('wba_received')).toBe('No WBAs logged yet')
    expect(emptyHeading('mentor_meeting')).toBe('No mentor meetings logged yet')
  })

  it('summarises rows without "1 attempts" or "Score Pass"', () => {
    expect(logRowSummary({ cpd_hours: null, score: 'Pass', attempts: 1, cost_pence: null })).toBe('1st attempt - Result: Pass')
    expect(logRowSummary({ cpd_hours: 1, score: null, attempts: null, cost_pence: 25000 })).toBe('1 CPD hour - £250.00')
    expect(logRowSummary({ cpd_hours: 6, score: null, attempts: null, cost_pence: null })).toBe('6 CPD hours')
  })
})

describe('buildPersonalLogMeta', () => {
  it('stores a rotation end date and keeps keys the form does not own', () => {
    expect(buildPersonalLogMeta({ detail: 'old', extra: 1 }, 'rotation', { detail: ' Ward 7 ', endDate: '2026-12-01' }))
      .toEqual({ detail: 'Ward 7', end_date: '2026-12-01', extra: 1 })
  })

  it('removes the end date when it is cleared (rotation becomes ongoing)', () => {
    expect(buildPersonalLogMeta({ end_date: '2026-12-01' }, 'rotation', { endDate: '' })).toEqual({})
  })

  it('stores only a valid WBA type', () => {
    expect(buildPersonalLogMeta({}, 'wba_received', { wbaType: 'dops' })).toEqual({ wba_type: 'dops' })
    expect(buildPersonalLogMeta({ wba_type: 'cbd' }, 'wba_received', { wbaType: 'nonsense' })).toEqual({})
  })

  it('ignores rotation/WBA fields for other kinds', () => {
    expect(buildPersonalLogMeta({}, 'exam', { endDate: '2026-12-01', wbaType: 'cbd' })).toEqual({})
  })
})

describe('isUpcoming', () => {
  it('is true only for dates after today', () => {
    expect(isUpcoming('2027-01-15', '2026-10-01')).toBe(true)
    expect(isUpcoming('2026-10-01', '2026-10-01')).toBe(false)
  })
})
