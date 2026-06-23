import type { Case } from '@/lib/types/cases'
import type { Category, PortfolioEntry } from '@/lib/types/portfolio'

// The auto green/amber/red "completeness" signal was removed pre-launch (Batch 3
// / F-016): it judged the wrong field on free-form categories and was replaced
// by a user-set importance rating. What remains here is only the "missing
// fields" helper, which still powers the optional "Missing <field>" list filter
// on /portfolio and /cases (a neutral checklist, not a quality score).

type AnyEntry = Partial<PortfolioEntry> & Record<string, unknown>
type AnyCase = Partial<Case> & Record<string, unknown>

const PORTFOLIO_REQUIRED: Record<Category, string[]> = {
  audit_qip: ['title', 'date', 'audit_type', 'audit_role', 'audit_cycle_stage', 'audit_outcome', 'specialty_tags'],
  teaching: ['title', 'date', 'teaching_type', 'teaching_audience', 'specialty_tags'],
  conference: ['title', 'date', 'conf_event_name', 'conf_attendance', 'specialty_tags'],
  publication: ['title', 'date', 'pub_journal', 'pub_status', 'specialty_tags'],
  leadership: ['title', 'date', 'leader_role', 'leader_organisation', 'specialty_tags'],
  prize: ['title', 'date', 'prize_body', 'prize_level', 'specialty_tags'],
  procedure: ['title', 'date', 'proc_name', 'proc_count', 'specialty_tags'],
  reflection: ['title', 'date', 'refl_type', 'notes:50', 'specialty_tags'],
  custom: ['title', 'date', 'notes', 'specialty_tags'],
}

const CASE_REQUIRED = ['title', 'date', 'clinical_domain', 'notes:30']

// Human-readable labels surfaced in completeness tooltips ("Missing: …").
// Keep in sync with the required-field lists above. Anything not listed here
// falls back to a title-cased version of the slug rather than the raw slug.
const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  date: 'Date',
  notes: 'Notes',
  audit_type: 'Audit type',
  audit_role: 'Role',
  audit_cycle_stage: 'Cycle stage',
  audit_outcome: 'Outcome',
  audit_trust: 'Trust / hospital',
  teaching_type: 'Teaching type',
  teaching_audience: 'Audience',
  conf_event_name: 'Event name',
  conf_attendance: 'Attendance type',
  pub_journal: 'Journal',
  pub_status: 'Status',
  leader_role: 'Role',
  leader_organisation: 'Organisation',
  prize_body: 'Awarding body',
  prize_level: 'Level',
  proc_name: 'Procedure name',
  proc_count: 'Number performed',
  refl_type: 'Reflection type',
  specialty_tags: 'Linked specialties',
  clinical_domain: 'Clinical domain',
}

function fieldLabel(field: string) {
  const key = field.split(':')[0]
  if (FIELD_LABELS[key]) return FIELD_LABELS[key]
  // Last-resort fallback for slugs we have not labelled yet. Title-case the
  // slug rather than leaking it as a raw "audit_role" string.
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function populated(entry: Record<string, unknown>, rule: string) {
  const [field, minLength] = rule.split(':')
  const value = entry[field]
  if (Array.isArray(value)) return value.length > 0
  // 0 is a valid recorded count (e.g. proc_count: 0 = "tracked, none yet performed").
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0
  if (typeof value === 'string') return value.trim().length >= (minLength ? Number(minLength) : 1)
  return value != null && value !== false
}

export function missingCompletenessFields(entry: AnyEntry | AnyCase, type: 'portfolio' | 'case'): string[] {
  const required = type === 'case'
    ? CASE_REQUIRED
    : PORTFOLIO_REQUIRED[(entry.category as Category | undefined) ?? 'custom']
  return required.filter(rule => !populated(entry, rule)).map(fieldLabel)
}
