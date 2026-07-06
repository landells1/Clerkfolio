// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  londonDateKey,
  isoWeekKey,
  buildActiveWeekCache,
  currentStreakFromActiveWeeks,
  activeWeeksYearToDate,
  currentLondonWeekWindow,
  previousLondonMonthWindow,
  londonDateStartUtc,
  londonDateParts,
} from '@/lib/engagement/streaks'

describe('londonDateKey — UK date convention', () => {
  it('formats a plain UTC midday timestamp as its own calendar day', () => {
    expect(londonDateKey('2026-03-15T12:00:00.000Z')).toBe('2026-03-15')
  })

  it('rolls a late-UTC-evening timestamp forward into the next London day during BST', () => {
    // 2026-06-15 23:30 UTC is 2026-06-16 00:30 in London (BST, UTC+1).
    expect(londonDateKey('2026-06-15T23:30:00.000Z')).toBe('2026-06-16')
  })

  it('does NOT roll forward in winter (GMT, UTC+0) at the same clock time', () => {
    expect(londonDateKey('2026-01-15T23:30:00.000Z')).toBe('2026-01-15')
  })

  it('accepts a Date object as well as an ISO string', () => {
    expect(londonDateKey(new Date('2026-03-15T00:00:00.000Z'))).toBe('2026-03-15')
  })
})

describe('londonDateParts / londonDateStartUtc round-trip', () => {
  it('recovers midnight UTC for a UTC-supplied date with no DST in effect', () => {
    const parts = londonDateParts('2026-01-10T00:00:00.000Z')
    expect(parts).toEqual({ year: 2026, month: 1, day: 10 })
    expect(londonDateStartUtc(parts).toISOString()).toBe('2026-01-10T00:00:00.000Z')
  })

  it('during BST, midnight London time is 23:00 UTC the previous day', () => {
    const parts = { year: 2026, month: 6, day: 15 }
    expect(londonDateStartUtc(parts).toISOString()).toBe('2026-06-14T23:00:00.000Z')
  })
})

describe('isoWeekKey', () => {
  it('assigns a Monday and the following Sunday to the same ISO week', () => {
    // 2026-06-15 is a Monday.
    const monday = isoWeekKey('2026-06-15T10:00:00.000Z')
    const sunday = isoWeekKey('2026-06-21T10:00:00.000Z')
    expect(monday).toBe(sunday)
  })

  it('assigns the following Monday to the next ISO week', () => {
    const week1 = isoWeekKey('2026-06-15T10:00:00.000Z')
    const week2 = isoWeekKey('2026-06-22T10:00:00.000Z')
    expect(week1).not.toBe(week2)
  })

  it('handles the year-boundary case (ISO week can belong to the adjacent year)', () => {
    // 2025-12-29 is a Monday and starts ISO week 2026-W01 per the ISO 8601 rule
    // (the week containing the year's first Thursday).
    expect(isoWeekKey('2025-12-29T10:00:00.000Z')).toBe('2026-W01')
  })
})

describe('buildActiveWeekCache', () => {
  it('returns unique, sorted week keys from a set of timestamps', () => {
    const now = new Date('2026-07-06T12:00:00.000Z')
    const createdAtValues = [
      '2026-06-15T10:00:00.000Z', // week A
      '2026-06-16T10:00:00.000Z', // same week A (Tue)
      '2026-06-22T10:00:00.000Z', // week B
    ]
    const weeks = buildActiveWeekCache(createdAtValues, now)
    expect(weeks).toEqual([...weeks].sort())
    expect(new Set(weeks).size).toBe(weeks.length)
    expect(weeks).toContain(isoWeekKey('2026-06-15T10:00:00.000Z'))
    expect(weeks).toContain(isoWeekKey('2026-06-22T10:00:00.000Z'))
    expect(weeks.length).toBe(2)
  })

  it('excludes timestamps older than 370 days before "now"', () => {
    const now = new Date('2026-07-06T12:00:00.000Z')
    const tooOld = new Date(now)
    tooOld.setUTCDate(tooOld.getUTCDate() - 400)
    const weeks = buildActiveWeekCache([tooOld.toISOString()], now)
    expect(weeks).toEqual([])
  })

  it('includes a timestamp exactly at the 370-day cutoff', () => {
    const now = new Date('2026-07-06T12:00:00.000Z')
    const atCutoff = new Date(now)
    atCutoff.setUTCDate(atCutoff.getUTCDate() - 370)
    const weeks = buildActiveWeekCache([atCutoff.toISOString()], now)
    expect(weeks).toEqual([isoWeekKey(atCutoff.toISOString())])
  })

  it('returns an empty array for an empty history', () => {
    expect(buildActiveWeekCache([])).toEqual([])
  })

  it('caps the result at the most recent 52 weeks', () => {
    const now = new Date('2026-07-06T12:00:00.000Z')
    // Build 60 distinct weekly timestamps within the 370-day window.
    const values: string[] = []
    for (let i = 0; i < 60; i++) {
      const d = new Date(now)
      d.setUTCDate(d.getUTCDate() - i * 7)
      values.push(d.toISOString())
    }
    const weeks = buildActiveWeekCache(values, now)
    expect(weeks.length).toBeLessThanOrEqual(52)
  })
})

describe('currentStreakFromActiveWeeks', () => {
  it('returns 0 for an empty active-weeks list', () => {
    expect(currentStreakFromActiveWeeks([])).toBe(0)
  })

  it('counts back-to-back weeks including the current week as a streak', () => {
    const now = new Date('2026-07-06T12:00:00.000Z') // a Monday
    const currentWeek = isoWeekKey(now.toISOString())
    const lastWeek = isoWeekKey(new Date(now.getTime() - 7 * 86400000).toISOString())
    const twoWeeksAgo = isoWeekKey(new Date(now.getTime() - 14 * 86400000).toISOString())

    expect(currentStreakFromActiveWeeks([currentWeek, lastWeek, twoWeeksAgo], now)).toBe(3)
  })

  it('does not require the CURRENT week to be active to keep the streak alive (grace for "this week not logged yet")', () => {
    const now = new Date('2026-07-06T12:00:00.000Z')
    const lastWeek = isoWeekKey(new Date(now.getTime() - 7 * 86400000).toISOString())
    const twoWeeksAgo = isoWeekKey(new Date(now.getTime() - 14 * 86400000).toISOString())

    // Current week absent, but the prior two weeks are consecutive: pinning
    // that offset===0 (this week) is skipped rather than treated as a break.
    expect(currentStreakFromActiveWeeks([lastWeek, twoWeeksAgo], now)).toBe(2)
  })

  it('stops counting at the first gap before the current week', () => {
    const now = new Date('2026-07-06T12:00:00.000Z')
    const currentWeek = isoWeekKey(now.toISOString())
    const threeWeeksAgo = isoWeekKey(new Date(now.getTime() - 21 * 86400000).toISOString())

    // Missing "last week" and "two weeks ago" breaks the streak immediately
    // after the current week is counted.
    expect(currentStreakFromActiveWeeks([currentWeek, threeWeeksAgo], now)).toBe(1)
  })

  it('returns 0 when only a non-recent week is active (streak fully broken)', () => {
    const now = new Date('2026-07-06T12:00:00.000Z')
    const fiveWeeksAgo = isoWeekKey(new Date(now.getTime() - 35 * 86400000).toISOString())
    expect(currentStreakFromActiveWeeks([fiveWeeksAgo], now)).toBe(0)
  })

  it('caps the lookback at 52 weeks', () => {
    const now = new Date('2026-07-06T12:00:00.000Z')
    const allWeeks: string[] = []
    for (let i = 0; i < 60; i++) {
      const d = new Date(now)
      d.setUTCDate(d.getUTCDate() - i * 7)
      allWeeks.push(isoWeekKey(d.toISOString()))
    }
    // Every week for 60 weeks back is active, but the function only looks
    // back 52 iterations (offset > -52), so the streak cannot exceed 52.
    expect(currentStreakFromActiveWeeks(allWeeks, now)).toBeLessThanOrEqual(52)
  })
})

describe('activeWeeksYearToDate', () => {
  it('counts only weeks whose ISO-week-year matches the current year', () => {
    const now = new Date('2026-07-06T12:00:00.000Z')
    const weeks = ['2026-W01', '2026-W20', '2025-W52', '2027-W01']
    expect(activeWeeksYearToDate(weeks, now)).toBe(2)
  })

  it('returns 0 for an empty list', () => {
    expect(activeWeeksYearToDate([], new Date('2026-07-06T12:00:00.000Z'))).toBe(0)
  })
})

describe('currentLondonWeekWindow', () => {
  it('returns a Monday-to-Monday (exclusive end) window containing "now"', () => {
    const now = new Date('2026-07-08T12:00:00.000Z') // a Wednesday
    const { start, end } = currentLondonWeekWindow(now)
    expect(start.getTime()).toBeLessThanOrEqual(now.getTime())
    expect(end.getTime()).toBeGreaterThan(now.getTime())
    expect(end.getTime() - start.getTime()).toBe(7 * 86400000)
  })

  it('anchors the window to Monday even when "now" is a Sunday', () => {
    const sunday = new Date('2026-07-12T12:00:00.000Z')
    const { start } = currentLondonWeekWindow(sunday)
    // The Monday that starts this week is 2026-07-06.
    expect(londonDateKey(start.toISOString())).toBe('2026-07-06')
  })
})

describe('previousLondonMonthWindow', () => {
  it('returns the full previous calendar month window and a human label', () => {
    const now = new Date('2026-07-06T09:00:00.000Z')
    const { start, end, label } = previousLondonMonthWindow(now)
    expect(londonDateKey(start.toISOString())).toBe('2026-06-01')
    expect(londonDateKey(end.toISOString())).toBe('2026-07-01')
    expect(label).toBe('June 2026')
  })

  it('rolls back across a year boundary in January', () => {
    const now = new Date('2026-01-15T09:00:00.000Z')
    const { start, end, label } = previousLondonMonthWindow(now)
    expect(londonDateKey(start.toISOString())).toBe('2025-12-01')
    expect(londonDateKey(end.toISOString())).toBe('2026-01-01')
    expect(label).toBe('December 2025')
  })
})
