export type ParsedSearchQuery = {
  raw: string
  terms: string[]
  anyTerms: string[]
  notTerms: string[]
  specialty?: string
  theme?: string
  since?: string
  hasNotes?: boolean
  category?: string
  missing?: string
}

type SearchableRecord = Record<string, unknown>

function tokens(input: string) {
  return input.match(/"[^"]+"|\S+/g)?.map(token => token.replace(/^"|"$/g, '')) ?? []
}

function normalise(value: unknown) {
  return String(value ?? '').toLowerCase()
}

function normaliseDate(value: string) {
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`
  return value
}

/**
 * Hand-rolled grammar for the saved-search / list-filter query language:
 * quoted phrases, AND / OR / NOT operators, and `field:value` filters
 * (specialty|tag, theme, since, category, missing, has:notes; the removed
 * completeness grammar complete:/min:/max: parses as a recognised no-op).
 *
 * Buckets: plain terms default to `terms` (all must match), `OR` moves terms
 * into `anyTerms` (at least one must match), `NOT` puts the next term in
 * `notTerms` (none may match).
 *
 * The subtle part is the RETROACTIVE OR-grouping fixup
 * (movePreviousPlainTermIntoOrGroup): by the time we see `OR` in `a OR b`,
 * `a` was already committed to the AND bucket, so the previous plain term is
 * moved from `terms` into `anyTerms` before `b` is parsed. `plainTermBuckets`
 * records where each plain term landed so only the LAST occurrence moves
 * (`a a OR b` keeps the first `a` in the AND bucket). Field filters and
 * NOT-terms never participate in OR groups - the lookback deliberately
 * ignores them.
 *
 * Grammar changes risk disturbing that OR-lookback: keep
 * tests/lib/search/parser.test.ts green and extend it with the new grammar.
 */
export function parseSearchQuery(input: string): ParsedSearchQuery {
  const parsed: ParsedSearchQuery = {
    raw: input,
    terms: [],
    anyTerms: [],
    notTerms: [],
  }
  const parts = tokens(input)
  let nextOperator: 'and' | 'or' = 'and'
  let negateNext = false
  const plainTermBuckets: Array<{ bucket: 'terms' | 'anyTerms' | 'notTerms'; value: string }> = []

  function removeLastOccurrence(values: string[], value: string) {
    const index = values.lastIndexOf(value)
    if (index === -1) return values
    return [...values.slice(0, index), ...values.slice(index + 1)]
  }

  function movePreviousPlainTermIntoOrGroup() {
    const lastPlainTerm = plainTermBuckets.at(-1)
    if (!lastPlainTerm || lastPlainTerm.bucket !== 'terms') return
    parsed.terms = removeLastOccurrence(parsed.terms, lastPlainTerm.value)
    parsed.anyTerms.push(lastPlainTerm.value)
    lastPlainTerm.bucket = 'anyTerms'
  }

  function pushPlainTerm(value: string) {
    const normalized = value.toLowerCase()
    if (negateNext) {
      parsed.notTerms.push(normalized)
      plainTermBuckets.push({ bucket: 'notTerms', value: normalized })
    } else if (nextOperator === 'or') {
      parsed.anyTerms.push(normalized)
      plainTermBuckets.push({ bucket: 'anyTerms', value: normalized })
    } else {
      parsed.terms.push(normalized)
      plainTermBuckets.push({ bucket: 'terms', value: normalized })
    }
    negateNext = false
    nextOperator = 'and'
  }

  for (const part of parts) {
    const upper = part.toUpperCase()
    if (upper === 'AND') { nextOperator = 'and'; continue }
    if (upper === 'OR') {
      movePreviousPlainTermIntoOrGroup()
      nextOperator = 'or'
      continue
    }
    if (upper === 'NOT') { negateNext = true; continue }

    const fieldMatch = part.match(/^([a-z_]+):(.+)$/i)
    if (fieldMatch) {
      const [, field, rawValue] = fieldMatch
      const value = rawValue.trim()
      if (field === 'specialty' || field === 'tag') parsed.specialty = value.toLowerCase()
      else if (field === 'theme') parsed.theme = value.toLowerCase()
      else if (field === 'since') parsed.since = normaliseDate(value)
      else if (field === 'category') parsed.category = value.toLowerCase()
      else if (field === 'missing') parsed.missing = value.toLowerCase()
      else if (field === 'has' && value.toLowerCase() === 'notes') parsed.hasNotes = true
      // `complete:`/`min:`/`max:` were the removed completeness filter (Batch 3 /
      // F-016). Recognise and ignore them so any saved search that still carries
      // the grammar degrades to a no-op rather than matching them as plain text.
      else if (field === 'complete' || field === 'min' || field === 'max') { /* no-op */ }
      else pushPlainTerm(part)
      if (field === 'specialty' || field === 'tag' || field === 'theme' || field === 'since' || field === 'category' || field === 'missing' || (field === 'has' && value.toLowerCase() === 'notes') || field === 'complete' || field === 'min' || field === 'max') {
        negateNext = false
        nextOperator = 'and'
      }
      continue
    }

    pushPlainTerm(part)
  }

  return parsed
}

function textFor(record: SearchableRecord, extraFields: string[] = []) {
  const fields = [
    'title', 'notes', 'category', 'clinical_domain', 'clinical_domains',
    'specialty_tags', 'interview_themes', 'audit_outcome', 'refl_free_text',
    'file_names',
    ...extraFields,
  ]
  return fields.map(field => {
    const value = record[field]
    return Array.isArray(value) ? value.join(' ') : String(value ?? '')
  }).join(' ').toLowerCase()
}

function arrayIncludes(value: unknown, needle: string) {
  if (!Array.isArray(value)) return false
  return value.some(item => normalise(item).includes(needle))
}

export function matchesParsedQuery(
  record: SearchableRecord,
  parsed: ParsedSearchQuery,
  options: {
    missingFields?: string[]
    extraFields?: string[]
  } = {},
) {
  const haystack = textFor(record, options.extraFields)

  if (parsed.terms.length > 0 && parsed.terms.some(term => !haystack.includes(term))) return false
  if (parsed.anyTerms.length > 0 && !parsed.anyTerms.some(term => haystack.includes(term))) return false
  if (parsed.notTerms.length > 0 && parsed.notTerms.some(term => haystack.includes(term))) return false
  if (parsed.specialty && !arrayIncludes(record.specialty_tags, parsed.specialty) && !arrayIncludes(record.clinical_domains, parsed.specialty) && !normalise(record.clinical_domain).includes(parsed.specialty)) return false
  if (parsed.theme && !arrayIncludes(record.interview_themes, parsed.theme)) return false
  if (parsed.category && normalise(record.category) !== parsed.category) return false
  if (parsed.since && normalise(record.date) < parsed.since) return false
  if (parsed.hasNotes && !normalise(record.notes).trim()) return false
  if (parsed.missing && !(options.missingFields ?? []).some(field => field.toLowerCase().includes(parsed.missing!))) return false

  return true
}
