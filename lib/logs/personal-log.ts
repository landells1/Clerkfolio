import { isWbaType, type WbaType } from '@/lib/logs/wba'
import { ordinal } from '@/lib/utils/plural'

// Shared wording and meta handling for the personal log (Logs pages).

export type PersonalLogKind = 'mandatory_training' | 'course' | 'exam' | 'mentor_meeting' | 'oop' | 'rotation' | 'wba_received' | 'teaching_observed'

/** Singular noun used mid-sentence ("Save WBA", "Add mentor meeting"). */
export const PERSONAL_LOG_NOUNS: Record<PersonalLogKind, string> = {
  mandatory_training: 'mandatory training',
  course: 'course',
  exam: 'exam',
  mentor_meeting: 'mentor meeting',
  oop: 'OOP or taster',
  rotation: 'rotation',
  wba_received: 'WBA',
  teaching_observed: 'teaching observation',
}

/** Plural noun for empty states ("No WBAs logged yet"). */
export const PERSONAL_LOG_PLURALS: Record<PersonalLogKind, string> = {
  mandatory_training: 'mandatory training',
  course: 'courses',
  exam: 'exams',
  mentor_meeting: 'mentor meetings',
  oop: 'OOP or taster entries',
  rotation: 'rotations',
  wba_received: 'WBAs',
  teaching_observed: 'teaching observations',
}

export function saveLabel(kind: PersonalLogKind): string {
  return `Save ${PERSONAL_LOG_NOUNS[kind]}`
}

export function addHeading(kind: PersonalLogKind): string {
  return `Add ${PERSONAL_LOG_NOUNS[kind]}`
}

export function emptyHeading(kind: PersonalLogKind): string {
  return `No ${PERSONAL_LOG_PLURALS[kind]} logged yet`
}

export type PersonalLogMeta = {
  detail?: string
  end_date?: string
  wba_type?: WbaType
} & Record<string, unknown>

/**
 * Build the jsonb meta for a save, keeping any keys this form does not own so
 * an edit never silently drops data. Empty values remove their key.
 */
export function buildPersonalLogMeta(
  existing: Record<string, unknown> | null | undefined,
  kind: PersonalLogKind,
  fields: { detail?: string; endDate?: string; wbaType?: string },
): PersonalLogMeta {
  const meta: PersonalLogMeta = { ...(existing ?? {}) }
  const detail = fields.detail?.trim()
  if (detail) meta.detail = detail
  else delete meta.detail
  if (kind === 'rotation') {
    if (fields.endDate && /^\d{4}-\d{2}-\d{2}$/.test(fields.endDate)) meta.end_date = fields.endDate
    else delete meta.end_date
  }
  if (kind === 'wba_received') {
    if (isWbaType(fields.wbaType)) meta.wba_type = fields.wbaType
    else delete meta.wba_type
  }
  return meta
}

/** One-line structured summary for a log row ("2nd attempt - Result: Pass"). */
export function logRowSummary(row: {
  cpd_hours: number | null
  score: string | null
  attempts: number | null
  cost_pence: number | null
}): string {
  return [
    row.cpd_hours ? `${row.cpd_hours} CPD ${row.cpd_hours === 1 ? 'hour' : 'hours'}` : '',
    row.attempts ? `${ordinal(row.attempts)} attempt` : '',
    row.score ? `Result: ${row.score}` : '',
    row.cost_pence ? `£${(row.cost_pence / 100).toFixed(2)}` : '',
  ].filter(Boolean).join(' - ')
}

/** An exam (or any dated log row) whose date is still ahead. */
export function isUpcoming(dateKey: string, todayKey: string): boolean {
  return dateKey.slice(0, 10) > todayKey
}
