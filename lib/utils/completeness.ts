import type { Case } from '@/lib/types/cases'
import type { Category, PortfolioEntry } from '@/lib/types/portfolio'

type AnyEntry = Partial<PortfolioEntry> & Record<string, unknown>
type AnyCase = Partial<Case> & Record<string, unknown>
type Completeness = 'green' | 'amber' | 'red'

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

function fieldLabel(field: string) {
  return field.split(':')[0].replace(/_/g, ' ')
}

function populated(entry: Record<string, unknown>, rule: string) {
  const [field, minLength] = rule.split(':')
  const value = entry[field]
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'number') return Number.isFinite(value) && value > 0
  if (typeof value === 'string') return value.trim().length >= (minLength ? Number(minLength) : 1)
  return value != null && value !== false
}

export function missingCompletenessFields(entry: AnyEntry | AnyCase, type: 'portfolio' | 'case'): string[] {
  const required = type === 'case'
    ? CASE_REQUIRED
    : PORTFOLIO_REQUIRED[(entry.category as Category | undefined) ?? 'custom']
  return required.filter(rule => !populated(entry, rule)).map(fieldLabel)
}

export function calculateCompleteness(entry: AnyEntry | AnyCase, type: 'portfolio' | 'case'): Completeness {
  const missing = missingCompletenessFields(entry, type).length
  if (missing === 0) return 'green'
  if (missing === 1) return 'amber'
  return 'red'
}

export function completenessScore(entry: AnyEntry | AnyCase, type: 'portfolio' | 'case') {
  const level = calculateCompleteness(entry, type)
  return level === 'green' ? 2 : level === 'amber' ? 1 : 0
}
