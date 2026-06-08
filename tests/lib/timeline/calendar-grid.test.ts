// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { localIsoDate, monthGridDays } from '@/lib/timeline/calendar-grid'

describe('localIsoDate', () => {
  it('formats from local calendar components, not UTC', () => {
    // Local midnight on 10 June 2026. toISOString() would shift this to the
    // 9th in any UTC+ timezone; localIsoDate must always yield the 10th.
    const d = new Date(2026, 5, 10)
    expect(localIsoDate(d)).toBe('2026-06-10')
  })

  it('zero-pads month and day', () => {
    expect(localIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('monthGridDays', () => {
  it('returns 42 cells', () => {
    expect(monthGridDays(new Date(2026, 5, 1))).toHaveLength(42)
  })

  it('starts on the Monday on/before the 1st (Monday-first grid)', () => {
    // 1 June 2026 is a Monday, so the grid starts exactly there.
    const days = monthGridDays(new Date(2026, 5, 1))
    expect(localIsoDate(days[0])).toBe('2026-06-01')
    expect(days[0].getDay()).toBe(1) // Monday
  })

  it('places a deadline in the correct day-of-week cell (BUG-004)', () => {
    // 10 June 2026 is a Wednesday. With a Monday-first grid where the 1st is
    // under Monday, the 10th sits at index 9 (cell label "10", column "Wed").
    const days = monthGridDays(new Date(2026, 5, 1))
    const cell = days.find(day => localIsoDate(day) === '2026-06-10')
    expect(cell).toBeDefined()
    expect(cell!.getDate()).toBe(10)
    expect(cell!.getDay()).toBe(3) // Wednesday
  })

  it('pads into the previous month when the 1st is mid-week', () => {
    // 1 Aug 2026 is a Saturday; the grid backfills to Mon 27 Jul.
    const days = monthGridDays(new Date(2026, 7, 1))
    expect(localIsoDate(days[0])).toBe('2026-07-27')
    expect(days[0].getDay()).toBe(1)
  })
})
