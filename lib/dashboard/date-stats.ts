import { buildActiveWeekCache } from '@/lib/engagement/streaks'

// Date semantics for dashboard and list statistics.
//
// Every statistic that answers "when did this happen" (activity heatmap,
// entries-per-month trend, time since last entry, category "Last:", cases
// "This month" / "Avg per week", streak and active weeks) reads the record's
// OWN date column (portfolio_entries.date, cases.date) - a bare YYYY-MM-DD
// calendar date. created_at only means "when it was typed into Clerkfolio" and
// is reserved for "recently added" feeds and nudges, so a doctor who backfills
// six months of entries in one sitting sees those six months, not one spike.
//
// Future-dated rows (a planned course, a pre-filled booking) never count as
// activity that already happened. All helpers here are pure and take "today"
// as a YYYY-MM-DD key (the UK calendar day - see londonDateKey) so they are
// deterministic in tests.

export type DatedRow = { date: string | null | undefined }

/** Normalise a date or timestamp string to its YYYY-MM-DD calendar key. */
export function dayKey(value: string): string {
  return value.slice(0, 10)
}

function isDayKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/** The rows' calendar dates, dropping blanks and anything after `todayKey`. */
export function pastDayKeys(rows: DatedRow[], todayKey: string): string[] {
  const keys: string[] = []
  for (const row of rows) {
    if (!row.date) continue
    const key = dayKey(row.date)
    if (!isDayKey(key) || key > todayKey) continue
    keys.push(key)
  }
  return keys
}

/** Whole days from `fromKey` to `toKey` (calendar arithmetic, no time zones). */
export function daysBetween(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split('-').map(Number)
  const [ty, tm, td] = toKey.split('-').map(Number)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000)
}

/** `todayKey` shifted by `days` (negative goes back). */
export function addDays(todayKey: string, days: number): string {
  const [y, m, d] = todayKey.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return date.toISOString().slice(0, 10)
}

/** Heatmap input: one key per record dated inside [windowStartKey, todayKey]. */
export function heatmapDayKeys(rows: DatedRow[], todayKey: string, windowStartKey: string): string[] {
  return pastDayKeys(rows, todayKey).filter(key => key >= windowStartKey)
}

/** The most recent past date among the rows, or null when none qualify. */
export function latestPastDate(rows: DatedRow[], todayKey: string): string | null {
  const keys = pastDayKeys(rows, todayKey)
  if (keys.length === 0) return null
  return keys.reduce((latest, key) => (key > latest ? key : latest))
}

/** Neutral "how long ago" label for a past calendar date. */
export function ageLabel(dateKey: string | null, todayKey: string): string {
  if (!dateKey) return 'Never'
  const days = Math.max(0, daysBetween(dateKey, todayKey))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 10) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export type MonthBucket = { key: string; label: string }

/** The trailing 12 calendar months ending with the month containing todayKey. */
export function trailingMonths(todayKey: string, count = 12): MonthBucket[] {
  const [y, m] = todayKey.split('-').map(Number)
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(y, m - 1 - (count - 1 - index), 1))
    const key = date.toISOString().slice(0, 7)
    return { key, label: date.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }) }
  })
}

/** Count of rows per YYYY-MM month key (past-dated rows only). */
export function countByMonth(rows: DatedRow[], todayKey: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const key of pastDayKeys(rows, todayKey)) {
    const month = key.slice(0, 7)
    counts.set(month, (counts.get(month) ?? 0) + 1)
  }
  return counts
}

/** Rows dated in the calendar month that contains todayKey. */
export function countInCurrentMonth(rows: DatedRow[], todayKey: string): number {
  return countByMonth(rows, todayKey).get(todayKey.slice(0, 7)) ?? 0
}

/**
 * Average records per week across the span the user has actually been
 * logging: from the earlier of their first dated record and their signup day,
 * up to today. Returns null while that span is under two weeks so the first
 * figure shown is meaningful (an account two days old with three cases would
 * otherwise read "10.5 per week").
 */
export function averagePerWeek(rows: DatedRow[], todayKey: string, signupKey: string | null): number | null {
  const keys = pastDayKeys(rows, todayKey)
  const earliestRow = keys.length > 0 ? keys.reduce((min, key) => (key < min ? key : min)) : null
  const candidates = [earliestRow, signupKey && isDayKey(dayKey(signupKey)) ? dayKey(signupKey) : null].filter((v): v is string => Boolean(v))
  if (candidates.length === 0) return null
  const start = candidates.reduce((min, key) => (key < min ? key : min))
  const spanDays = daysBetween(start, todayKey) + 1
  if (spanDays < 14) return null
  if (keys.length === 0) return 0
  return Math.round((keys.length / (spanDays / 7)) * 10) / 10
}

/**
 * ISO week keys with at least one record dated in them (last 52 active weeks,
 * oldest first) - the same shape the nightly streak-cache cron stores.
 */
export function activeWeeksFromRows(rows: DatedRow[], todayKey: string, now = new Date()): string[] {
  return buildActiveWeekCache(pastDayKeys(rows, todayKey), now)
}
