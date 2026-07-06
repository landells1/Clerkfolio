import { describe, it, expect } from 'vitest'
import { nationalDeadlinesPref, shouldShowNationalDeadlines } from '@/lib/timeline/national-deadlines'

describe('shouldShowNationalDeadlines', () => {
  it('honours an explicit true even when specialty-specific deadlines exist', () => {
    expect(shouldShowNationalDeadlines(true, true)).toBe(true)
    expect(shouldShowNationalDeadlines(true, false)).toBe(true)
  })

  it('honours an explicit false even when nothing else is on the timeline', () => {
    expect(shouldShowNationalDeadlines(false, false)).toBe(false)
    expect(shouldShowNationalDeadlines(false, true)).toBe(false)
  })

  it('falls back to the legacy auto rule when the pref was never set', () => {
    expect(shouldShowNationalDeadlines(undefined, false)).toBe(true)
    expect(shouldShowNationalDeadlines(undefined, true)).toBe(false)
  })
})

describe('nationalDeadlinesPref', () => {
  it('reads a boolean show_national_deadlines from display_prefs', () => {
    expect(nationalDeadlinesPref({ show_national_deadlines: true })).toBe(true)
    expect(nationalDeadlinesPref({ show_national_deadlines: false })).toBe(false)
  })

  it('returns undefined for missing, non-boolean, or malformed prefs', () => {
    expect(nationalDeadlinesPref({})).toBeUndefined()
    expect(nationalDeadlinesPref({ show_national_deadlines: 'yes' })).toBeUndefined()
    expect(nationalDeadlinesPref(null)).toBeUndefined()
    expect(nationalDeadlinesPref(undefined)).toBeUndefined()
    expect(nationalDeadlinesPref([])).toBeUndefined()
    expect(nationalDeadlinesPref('dark')).toBeUndefined()
  })
})
