// Parser-level tests for parseSearchQuery (audit I-6). The existing coverage
// exercised matchesParsedQuery outcomes only; these pin the parse itself -
// especially the retroactive OR-grouping lookback, which is the densest part
// of the grammar and the easiest to disturb when extending it.
import { describe, expect, it } from 'vitest'
import { parseSearchQuery } from '@/lib/search/parser'

describe('parseSearchQuery', () => {
  it('puts plain terms in the AND bucket, lowercased', () => {
    const parsed = parseSearchQuery('Sepsis Audit')
    expect(parsed.terms).toEqual(['sepsis', 'audit'])
    expect(parsed.anyTerms).toEqual([])
    expect(parsed.notTerms).toEqual([])
  })

  it('keeps quoted phrases as single terms', () => {
    const parsed = parseSearchQuery('"chest pain" teaching')
    expect(parsed.terms).toEqual(['chest pain', 'teaching'])
  })

  it('retroactively moves the previous plain term into the OR group', () => {
    const parsed = parseSearchQuery('sepsis OR pneumonia')
    expect(parsed.terms).toEqual([])
    expect(parsed.anyTerms).toEqual(['sepsis', 'pneumonia'])
  })

  it('chains OR across more than two terms', () => {
    const parsed = parseSearchQuery('sepsis OR pneumonia OR asthma')
    expect(parsed.terms).toEqual([])
    expect(parsed.anyTerms).toEqual(['sepsis', 'pneumonia', 'asthma'])
  })

  it('only moves the LAST occurrence of a duplicated term into the OR group', () => {
    const parsed = parseSearchQuery('audit audit OR teaching')
    expect(parsed.terms).toEqual(['audit'])
    expect(parsed.anyTerms).toEqual(['audit', 'teaching'])
  })

  it('keeps AND terms outside a later OR group', () => {
    const parsed = parseSearchQuery('audit sepsis OR pneumonia')
    expect(parsed.terms).toEqual(['audit'])
    expect(parsed.anyTerms).toEqual(['sepsis', 'pneumonia'])
  })

  it('NOT negates exactly the next plain term', () => {
    const parsed = parseSearchQuery('audit NOT teaching sepsis')
    expect(parsed.terms).toEqual(['audit', 'sepsis'])
    expect(parsed.notTerms).toEqual(['teaching'])
  })

  it('does not move a NOT term into a following OR group', () => {
    const parsed = parseSearchQuery('NOT teaching OR audit')
    expect(parsed.notTerms).toEqual(['teaching'])
    expect(parsed.anyTerms).toEqual(['audit'])
    expect(parsed.terms).toEqual([])
  })

  it('parses field filters and resets pending operators after them', () => {
    const parsed = parseSearchQuery('specialty:imt theme:leadership since:2026-01 category:audit_qip missing:evidence has:notes')
    expect(parsed.specialty).toBe('imt')
    expect(parsed.theme).toBe('leadership')
    expect(parsed.since).toBe('2026-01-01')
    expect(parsed.category).toBe('audit_qip')
    expect(parsed.missing).toBe('evidence')
    expect(parsed.hasNotes).toBe(true)
    expect(parsed.terms).toEqual([])
  })

  it('accepts tag: as an alias for specialty:', () => {
    expect(parseSearchQuery('tag:imt').specialty).toBe('imt')
  })

  it('does not move a field filter into a following OR group', () => {
    const parsed = parseSearchQuery('specialty:imt OR sepsis')
    expect(parsed.specialty).toBe('imt')
    expect(parsed.anyTerms).toEqual(['sepsis'])
    expect(parsed.terms).toEqual([])
  })

  it('treats the removed completeness grammar as a recognised no-op', () => {
    const parsed = parseSearchQuery('complete:green min:2 max:5 sepsis')
    expect(parsed.terms).toEqual(['sepsis'])
    expect(parsed.anyTerms).toEqual([])
    expect(parsed.notTerms).toEqual([])
    expect(parsed.specialty).toBeUndefined()
  })

  it('treats an unknown field prefix as a plain term', () => {
    const parsed = parseSearchQuery('foo:bar')
    expect(parsed.terms).toEqual(['foo:bar'])
  })

  it('normalises YYYY-MM since values to the first of the month', () => {
    expect(parseSearchQuery('since:2025-11').since).toBe('2025-11-01')
    expect(parseSearchQuery('since:2025-11-15').since).toBe('2025-11-15')
  })

  it('parses an empty query to empty buckets', () => {
    const parsed = parseSearchQuery('')
    expect(parsed.terms).toEqual([])
    expect(parsed.anyTerms).toEqual([])
    expect(parsed.notTerms).toEqual([])
  })
})
