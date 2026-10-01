import { dayKey } from '@/lib/dashboard/date-stats'
import { rotationForDate, type RotationSpan } from '@/lib/logs/rotations'

// Workplace-based assessment types for the WBA log. The type is stored in
// personal_log.meta.wba_type (no schema change). Rows saved before the type
// picker existed have no stored type, so they fall back to inferring it from
// the title / detail text - the old behaviour - and anything that matches no
// named type (a DCT, a TAB, a free-form label) lands in "DCT / other" so every
// WBA is counted in exactly one column.

export const WBA_TYPES = ['cbd', 'mini_cex', 'dops', 'acat', 'other'] as const
export type WbaType = typeof WBA_TYPES[number]

export const WBA_TYPE_LABELS: Record<WbaType, string> = {
  cbd: 'CBD',
  mini_cex: 'Mini-CEX',
  dops: 'DOPS',
  acat: 'ACAT',
  other: 'DCT / other',
}

export function isWbaType(value: unknown): value is WbaType {
  return typeof value === 'string' && (WBA_TYPES as readonly string[]).includes(value)
}

/** Legacy fallback: sniff the type from free text. Order matters (Mini-CEX before CEX-like words). */
export function inferWbaType(text: string): WbaType {
  const value = text.toLowerCase()
  if (/mini[\s-]?cex/.test(value)) return 'mini_cex'
  if (/\bcbd\b|case[\s-]based discussion/.test(value)) return 'cbd'
  if (/\bdops?\b|directly observed procedur/.test(value)) return 'dops'
  if (/\bacat\b|acute care assessment/.test(value)) return 'acat'
  return 'other'
}

export type WbaRow = {
  title: string
  date: string
  meta: { detail?: string; wba_type?: string } | null
}

/** Stored type when present, otherwise the legacy text inference. */
export function wbaTypeFor(row: WbaRow): WbaType {
  const stored = row.meta?.wba_type
  if (isWbaType(stored)) return stored
  return inferWbaType(`${row.title} ${row.meta?.detail ?? ''}`)
}

export type WbaRotationRow = {
  key: string
  label: string
  start: string | null
  counts: Record<WbaType, number>
  total: number
}

function emptyCounts(): Record<WbaType, number> {
  return { cbd: 0, mini_cex: 0, dops: 0, acat: 0, other: 0 }
}

/**
 * WBAs grouped by the rotation whose span contains each WBA's date (one
 * rotation per WBA - see lib/logs/rotations.ts), with a trailing "Not in a
 * logged rotation" row for the rest. Rotations without any WBA are omitted.
 */
export function groupWbasByRotation(rows: WbaRow[], spans: RotationSpan[], todayKey: string): WbaRotationRow[] {
  const byKey = new Map<string, WbaRotationRow>()
  const unassigned: WbaRotationRow = { key: 'none', label: 'Not in a logged rotation', start: null, counts: emptyCounts(), total: 0 }
  for (const row of rows) {
    const date = row.date ? dayKey(row.date) : ''
    const span = date ? rotationForDate(spans, date, todayKey) : null
    let bucket = unassigned
    if (span) {
      bucket = byKey.get(span.id) ?? { key: span.id, label: span.title, start: span.start, counts: emptyCounts(), total: 0 }
      byKey.set(span.id, bucket)
    }
    bucket.counts[wbaTypeFor(row)] += 1
    bucket.total += 1
  }
  const grouped = Array.from(byKey.values()).sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''))
  return unassigned.total > 0 ? [...grouped, unassigned] : grouped
}
