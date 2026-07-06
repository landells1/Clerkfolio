// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import { relativeDate } from '@/lib/utils/dates'

describe('relativeDate', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "Today" for the current date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-06T15:00:00.000Z'))
    expect(relativeDate('2026-07-06')).toBe('Today')
  })

  it('returns "Yesterday" for one day ago', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-06T15:00:00.000Z'))
    expect(relativeDate('2026-07-05')).toBe('Yesterday')
  })

  it('returns "N days ago" for 2-6 days back', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-06T15:00:00.000Z'))
    expect(relativeDate('2026-07-03')).toBe('3 days ago')
  })

  it('returns "1 week ago" for 7-13 days back', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-06T15:00:00.000Z'))
    expect(relativeDate('2026-06-29')).toBe('1 week ago')
  })

  it('returns "N weeks ago" for 14-29 days back', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-06T15:00:00.000Z'))
    expect(relativeDate('2026-06-20')).toBe('2 weeks ago')
  })

  it('returns "1 month ago" for 30-59 days back', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-06T15:00:00.000Z'))
    expect(relativeDate('2026-06-01')).toBe('1 month ago')
  })

  it('returns "N months ago" for 60-364 days back', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-06T15:00:00.000Z'))
    expect(relativeDate('2026-01-06')).toBe('6 months ago')
  })

  it('returns "1 year ago" for 365-729 days back', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-06T15:00:00.000Z'))
    expect(relativeDate('2025-07-06')).toBe('1 year ago')
  })

  it('returns "N years ago" for 730+ days back', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-06T15:00:00.000Z'))
    expect(relativeDate('2020-07-06')).toBe('6 years ago')
  })

  it('returns "In the future" for a date after today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-06T15:00:00.000Z'))
    expect(relativeDate('2026-07-10')).toBe('In the future')
  })

  it('accepts a full ISO datetime string (not just a bare date) and still uses calendar-day diffing', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-06T15:00:00.000Z')) // 2026-07-06 16:00 BST
    expect(relativeDate('2026-07-06T01:00:00.000Z')).toBe('Today')
  })

  it('respects the London (BST) day boundary: a UTC evening timestamp that has already rolled into the next London day reads as "Today", not "Yesterday"', () => {
    // 2026-07-06T23:30 UTC is 2026-07-07 00:30 in London (BST, UTC+1) - the
    // default timezone param is Europe/London, so both "now" and the target
    // date fall in the same London calendar day (2026-07-07).
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-07T00:15:00.000Z')) // 2026-07-07 01:15 BST
    expect(relativeDate('2026-07-06T23:30:00.000Z')).toBe('Today')
  })
})
