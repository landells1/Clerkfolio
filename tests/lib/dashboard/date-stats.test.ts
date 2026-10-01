// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  activeWeeksFromRows,
  addDays,
  ageLabel,
  averagePerWeek,
  countByMonth,
  countInCurrentMonth,
  daysBetween,
  heatmapDayKeys,
  latestPastDate,
  pastDayKeys,
  trailingMonths,
} from '@/lib/dashboard/date-stats'

const TODAY = '2026-10-01'

// A doctor who backfilled six months of entries today: every row was CREATED
// today but is DATED across April to September.
const backfilled = [
  { date: '2026-04-06', created_at: '2026-10-01T10:00:00Z' },
  { date: '2026-04-20', created_at: '2026-10-01T10:01:00Z' },
  { date: '2026-06-15', created_at: '2026-10-01T10:02:00Z' },
  { date: '2026-08-05', created_at: '2026-10-01T10:03:00Z' },
  { date: '2026-09-30', created_at: '2026-10-01T10:04:00Z' },
]

describe('pastDayKeys', () => {
  it('reads the entry date, not created_at, and drops future and blank dates', () => {
    expect(pastDayKeys([...backfilled, { date: '2026-12-01' }, { date: null }], TODAY)).toEqual([
      '2026-04-06', '2026-04-20', '2026-06-15', '2026-08-05', '2026-09-30',
    ])
  })

  it('normalises timestamps to their calendar day', () => {
    expect(pastDayKeys([{ date: '2026-09-01T00:00:00+00:00' }], TODAY)).toEqual(['2026-09-01'])
  })
})

describe('calendar arithmetic', () => {
  it('counts whole days across month and DST boundaries', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2)
    expect(daysBetween(TODAY, TODAY)).toBe(0)
  })

  it('adds and subtracts days', () => {
    expect(addDays(TODAY, -1)).toBe('2026-09-30')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('heatmapDayKeys', () => {
  it('spreads backfilled entries across their real days inside the window', () => {
    expect(heatmapDayKeys(backfilled, TODAY, '2026-05-01')).toEqual(['2026-06-15', '2026-08-05', '2026-09-30'])
  })
})

describe('latestPastDate / ageLabel', () => {
  it('reports the latest entry date, ignoring future-dated rows', () => {
    expect(latestPastDate([...backfilled, { date: '2027-01-15' }], TODAY)).toBe('2026-09-30')
  })

  it('returns null when nothing has happened yet', () => {
    expect(latestPastDate([{ date: '2027-01-15' }], TODAY)).toBeNull()
  })

  it('labels ages neutrally', () => {
    expect(ageLabel(null, TODAY)).toBe('Never')
    expect(ageLabel(TODAY, TODAY)).toBe('Today')
    expect(ageLabel('2026-09-30', TODAY)).toBe('Yesterday')
    expect(ageLabel('2026-09-27', TODAY)).toBe('4d ago')
    expect(ageLabel('2026-09-03', TODAY)).toBe('4w ago')
    expect(ageLabel('2026-04-06', TODAY)).toBe('5mo ago')
  })
})

describe('monthly buckets', () => {
  it('lists the trailing 12 months ending with the current month', () => {
    const months = trailingMonths(TODAY)
    expect(months).toHaveLength(12)
    expect(months[0]).toEqual({ key: '2025-11', label: 'Nov' })
    expect(months[11]).toEqual({ key: '2026-10', label: 'Oct' })
  })

  it('buckets rows by their own month, so a backfill is not one spike', () => {
    const counts = countByMonth(backfilled, TODAY)
    expect(Object.fromEntries(counts)).toEqual({ '2026-04': 2, '2026-06': 1, '2026-08': 1, '2026-09': 1 })
  })

  it('counts this month by entry date', () => {
    expect(countInCurrentMonth(backfilled, TODAY)).toBe(0)
    expect(countInCurrentMonth(backfilled, '2026-09-30')).toBe(1)
  })
})

describe('averagePerWeek', () => {
  it('measures from the first dated record when that predates signup', () => {
    // 2026-04-06 .. 2026-10-01 is 179 days = 25.57 weeks; 5 rows => 0.2/wk
    expect(averagePerWeek(backfilled, TODAY, '2026-09-30T12:00:00Z')).toBe(0.2)
  })

  it('stays hidden until the span is two weeks long', () => {
    expect(averagePerWeek([{ date: TODAY }], TODAY, '2026-09-25T00:00:00Z')).toBeNull()
  })

  it('reports zero for an established account with no rows', () => {
    expect(averagePerWeek([], TODAY, '2026-06-01T00:00:00Z')).toBe(0)
  })
})

describe('activeWeeksFromRows', () => {
  it('derives ISO weeks from entry dates and ignores future rows', () => {
    const weeks = activeWeeksFromRows([...backfilled, { date: '2026-12-01' }], TODAY, new Date('2026-10-01T12:00:00Z'))
    expect(weeks).toEqual(['2026-W15', '2026-W17', '2026-W25', '2026-W32', '2026-W40'])
  })
})
