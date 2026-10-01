import { formatRotationMonths, rotationEndDate } from '@/lib/logs/rotations'
import { ordinal } from '@/lib/utils/plural'

/**
 * Shared pure-data builder for the personal_log-sourced CV sections
 * ("Rotations & placements", "Courses & Certifications" and "Examinations").
 * It is consumed identically
 * by all THREE CV renderings so they stay in lockstep:
 *   - the CV PDF (lib/pdf/portfolio-pdf.tsx source-of-truth + the
 *     portfolio-pdf-runtime.cjs module that actually renders on Vercel),
 *   - the CV DOCX (lib/export/cv-docx.ts, via CvDocData.logSections),
 *   - the on-page preview (app/(dashboard)/export/cv/page.tsx).
 *
 * Both /api/export/cv and /api/export/docx call buildCvLogSections() on the
 * SAME personal_log query result and hand the output to their renderer, so the
 * mapping lives in exactly one place.
 *
 * Clinical-content red-line: this only ever emits STRUCTURED fields (title,
 * dates, CPD hours, exam score, attempt count). Free-text columns (notes,
 * meta.detail) and the personal-finance cost_pence column are never selected
 * or rendered here - the rotation end date is read as the single JSON key
 * `meta->>end_date` (see CV_LOG_SELECT), never the whole meta object.
 *
 * Only things that have already happened appear: exams, courses and
 * rotations dated after today (a booked MSRA, a future placement) are left
 * out, so a planned exam can never read like one already sat.
 */

/** Structured subset of a personal_log row used by the CV export. Deliberately
 *  excludes notes / meta / cost_pence so free-text never reaches an export. */
export type CvLogRow = {
  id: string
  kind: string
  title: string
  date: string
  expires_at: string | null
  cpd_hours: number | null
  attempts: number | null
  score: string | null
  /** Rotation rows only: meta->>end_date (null = ongoing). */
  end_date?: string | null
}

export type CvLogDetail = { label: string; value: string }
export type CvLogEntry = { id: string; title: string; dateLabel: string; details: CvLogDetail[] }
export type CvLogSection = { key: string; title: string; entries: CvLogEntry[] }

/** The personal_log kinds sourced by the CV export, and the section each maps
 *  into. Used to scope the DB query in both export routes and the preview. */
export const CV_LOG_KINDS = ['rotation', 'course', 'mandatory_training', 'exam'] as const

/** The one select string all three CV renderings use for personal_log. */
export const CV_LOG_SELECT = 'id, kind, title, date, expires_at, cpd_hours, attempts, score, end_date:meta->>end_date'

const COURSE_KINDS = new Set(['course', 'mandatory_training'])

/** Same en-GB day/short-month/year format as the existing CV renderers. */
function formatLogDate(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function byDateDesc(a: CvLogRow, b: CvLogRow): number {
  return new Date(b.date).getTime() - new Date(a.date).getTime()
}

function courseDetails(row: CvLogRow): CvLogDetail[] {
  const details: CvLogDetail[] = [
    { label: 'Type', value: row.kind === 'mandatory_training' ? 'Mandatory training' : 'Course' },
  ]
  if (row.cpd_hours != null) details.push({ label: 'CPD hours', value: String(row.cpd_hours) })
  if (row.expires_at) details.push({ label: 'Expires', value: formatLogDate(row.expires_at) })
  return details
}

function examDetails(row: CvLogRow): CvLogDetail[] {
  const details: CvLogDetail[] = []
  if (row.attempts != null) details.push({ label: 'Attempt', value: ordinal(row.attempts) })
  if (row.score) details.push({ label: 'Score', value: row.score })
  return details
}

function toEntry(row: CvLogRow, details: CvLogDetail[]): CvLogEntry {
  return { id: row.id, title: row.title, dateLabel: formatLogDate(row.date), details }
}

function toRotationEntry(row: CvLogRow): CvLogEntry {
  const end = rotationEndDate({ date: row.date, meta: { end_date: row.end_date ?? undefined } })
  return { id: row.id, title: row.title, dateLabel: formatRotationMonths({ start: row.date.slice(0, 10), end }), details: [] }
}

/**
 * Builds the ordered log-sourced CV sections. Each section is sorted by date
 * descending (matching the portfolio sections) and any section with no rows is
 * omitted entirely so no empty header ever renders. `todayKey` (YYYY-MM-DD,
 * UK calendar day) drops anything dated in the future.
 */
export function buildCvLogSections(rows: CvLogRow[], todayKey: string): CvLogSection[] {
  const happened = rows.filter(r => r.date && r.date.slice(0, 10) <= todayKey)
  const rotations = happened.filter(r => r.kind === 'rotation').slice().sort(byDateDesc)
  const courses = happened.filter(r => COURSE_KINDS.has(r.kind)).slice().sort(byDateDesc)
  const exams = happened.filter(r => r.kind === 'exam').slice().sort(byDateDesc)

  const sections: CvLogSection[] = []
  if (rotations.length > 0) {
    sections.push({
      key: 'rotations',
      title: 'Rotations & placements',
      entries: rotations.map(toRotationEntry),
    })
  }
  if (courses.length > 0) {
    sections.push({
      key: 'courses',
      title: 'Courses & Certifications',
      entries: courses.map(r => toEntry(r, courseDetails(r))),
    })
  }
  if (exams.length > 0) {
    sections.push({
      key: 'exams',
      title: 'Examinations',
      entries: exams.map(r => toEntry(r, examDetails(r))),
    })
  }
  return sections
}
