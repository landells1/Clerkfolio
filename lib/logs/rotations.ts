import { dayKey } from '@/lib/dashboard/date-stats'

// Rotation spans from the personal_log `rotation` rows.
//
// A rotation's start is its `date` column; its end lives in
// `meta.end_date` (YYYY-MM-DD, optional - no schema change, the same jsonb
// bag that holds the free-text `meta.detail`). A missing or invalid end date
// means "ongoing". Nothing is ever parsed out of the free-text detail.
//
// Counting rule: each dated item (entry, case, WBA) belongs to at most ONE
// rotation - the one whose span contains its date. When spans overlap (an
// ongoing rotation that was never closed, or a one-week induction typed inside
// a longer block) the rotation that started most recently wins, so no item is
// ever counted twice and a short block is never credited with the whole
// surrounding rotation's work. Items after today are ignored.

export type RotationMeta = { detail?: string; end_date?: string } & Record<string, unknown>

export type RotationRow = {
  id: string
  title: string
  date: string
  meta: RotationMeta | null
}

export type RotationSpan = {
  id: string
  title: string
  detail: string | null
  start: string
  /** The end the user entered, or null for an ongoing rotation. */
  end: string | null
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/

/** The stored end date when it is a valid calendar date on/after the start. */
export function rotationEndDate(row: Pick<RotationRow, 'date' | 'meta'>): string | null {
  const raw = row.meta?.end_date
  if (typeof raw !== 'string' || !DAY_KEY.test(raw)) return null
  return raw >= dayKey(row.date) ? raw : null
}

/** Normalised spans, oldest start first (ties broken by id for stability). */
export function rotationSpans(rows: RotationRow[]): RotationSpan[] {
  return rows
    .filter(row => row.date && DAY_KEY.test(dayKey(row.date)))
    .map(row => ({
      id: row.id,
      title: row.title,
      detail: typeof row.meta?.detail === 'string' && row.meta.detail.trim() ? row.meta.detail.trim() : null,
      start: dayKey(row.date),
      end: rotationEndDate(row),
    }))
    .sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id))
}

/** Whether the calendar date falls inside the span (ongoing = up to today). */
export function spanContains(span: RotationSpan, dateKey: string, todayKey: string): boolean {
  if (dateKey > todayKey) return false
  const end = span.end ?? todayKey
  return dateKey >= span.start && dateKey <= end
}

/**
 * The single rotation an item dated `dateKey` belongs to: among the spans
 * containing it, the one that started most recently. Null when none do.
 */
export function rotationForDate(spans: RotationSpan[], dateKey: string, todayKey: string): RotationSpan | null {
  let match: RotationSpan | null = null
  for (const span of spans) {
    if (!spanContains(span, dateKey, todayKey)) continue
    if (!match || span.start > match.start || (span.start === match.start && span.id > match.id)) match = span
  }
  return match
}

/** Item counts per rotation id (each item counted once, see file header). */
export function countItemsPerRotation(
  spans: RotationSpan[],
  items: { date: string | null | undefined }[],
  todayKey: string,
): Map<string, number> {
  const counts = new Map<string, number>(spans.map(span => [span.id, 0]))
  for (const item of items) {
    if (!item.date) continue
    const span = rotationForDate(spans, dayKey(item.date), todayKey)
    if (span) counts.set(span.id, (counts.get(span.id) ?? 0) + 1)
  }
  return counts
}

function formatDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** "1 Aug 2026 - 7 Aug 2026" or "3 Dec 2026 - ongoing". */
export function formatRotationSpan(span: Pick<RotationSpan, 'start' | 'end'>): string {
  return `${formatDay(span.start)} - ${span.end ? formatDay(span.end) : 'ongoing'}`
}

/**
 * Month-and-year span for the CV: "Aug 2026 - Dec 2026", "Dec 2026 - present",
 * or just "Jun 2026" for a placement that starts and ends in the same month.
 */
export function formatRotationMonths(span: Pick<RotationSpan, 'start' | 'end'>): string {
  const month = (key: string) => {
    const [y, m] = key.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
  }
  if (span.end && span.end.slice(0, 7) === span.start.slice(0, 7)) return month(span.start)
  return `${month(span.start)} - ${span.end ? month(span.end) : 'present'}`
}
