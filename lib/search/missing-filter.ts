// The "Missing ..." list filter on /portfolio and /cases.
//
// Each option is a real predicate over the record's own fields. The previous
// implementation matched the option value against the human labels from the
// completeness field list, which broke twice: "specialty tags" never matched
// the label "Linked specialties" (so "Missing tags" always returned nothing),
// and "notes" meant the literal notes column, so reflections whose text lives
// in refl_free_text were reported as missing notes.

export type MissingFilterOption = { value: string; label: string }

export const PORTFOLIO_MISSING_OPTIONS: MissingFilterOption[] = [
  { value: 'notes', label: 'No written notes or reflection' },
  { value: 'tags', label: 'No linked specialties' },
  { value: 'themes', label: 'No competency themes' },
  { value: 'audit stage', label: 'Audit without a cycle stage' },
]

export const CASE_MISSING_OPTIONS: MissingFilterOption[] = [
  { value: 'notes', label: 'No notes' },
  { value: 'clinical area', label: 'No clinical area' },
  { value: 'tags', label: 'No linked specialties' },
  { value: 'themes', label: 'No competency themes' },
]

type AnyRecord = Record<string, unknown>

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function hasItems(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0
}

// Every free-text field that carries an entry's written content. A record
// with text in ANY of them is not "missing notes".
const PORTFOLIO_TEXT_FIELDS = ['notes', 'refl_free_text', 'custom_free_text', 'audit_outcome', 'prize_description']

// Accepted spellings for each option, including values carried by older URLs
// and saved searches ("specialty tags", "clinical domain", "audit cycle stage").
const ALIASES: Record<string, string> = {
  notes: 'notes',
  note: 'notes',
  content: 'notes',
  tags: 'tags',
  tag: 'tags',
  'specialty tags': 'tags',
  specialty: 'tags',
  specialties: 'tags',
  'linked specialties': 'tags',
  themes: 'themes',
  theme: 'themes',
  'audit stage': 'audit stage',
  'audit cycle stage': 'audit stage',
  'cycle stage': 'audit stage',
  'clinical area': 'clinical area',
  'clinical domain': 'clinical area',
  domain: 'clinical area',
  date: 'date',
}

/** Canonical option key for a raw `missing` value, or null when unknown. */
export function normaliseMissingKey(raw: string): string | null {
  return ALIASES[raw.trim().toLowerCase()] ?? null
}

/**
 * True when the record is missing the field the filter names. Unknown keys
 * return null so the caller can fall back to its legacy behaviour.
 */
export function isMissing(record: AnyRecord, rawKey: string, type: 'portfolio' | 'case'): boolean | null {
  const key = normaliseMissingKey(rawKey)
  switch (key) {
    case 'notes':
      return type === 'case'
        ? !hasText(record.notes)
        : !PORTFOLIO_TEXT_FIELDS.some(field => hasText(record[field]))
    case 'tags':
      return !hasItems(record.specialty_tags)
    case 'themes':
      return !hasItems(record.interview_themes)
    case 'audit stage':
      return type === 'portfolio' && record.category === 'audit_qip' && !hasText(record.audit_cycle_stage)
    case 'clinical area':
      return type === 'case' && !hasText(record.clinical_domain) && !hasItems(record.clinical_domains)
    case 'date':
      return !hasText(record.date)
    default:
      return null
  }
}

/** Human label for the active option (for the "Filtered by" banner). */
export function missingFilterLabel(rawKey: string, type: 'portfolio' | 'case'): string {
  const key = normaliseMissingKey(rawKey)
  const options = type === 'case' ? CASE_MISSING_OPTIONS : PORTFOLIO_MISSING_OPTIONS
  return options.find(option => option.value === key)?.label ?? `Missing ${rawKey}`
}
