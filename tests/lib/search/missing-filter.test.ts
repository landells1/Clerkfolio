// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { isMissing, missingFilterLabel, normaliseMissingKey } from '@/lib/search/missing-filter'
import { matchesParsedQuery, parseSearchQuery } from '@/lib/search/parser'
import { missingCompletenessFields } from '@/lib/utils/completeness'

describe('normaliseMissingKey', () => {
  it('accepts the values older URLs and saved searches carry', () => {
    expect(normaliseMissingKey('specialty tags')).toBe('tags')
    expect(normaliseMissingKey('clinical domain')).toBe('clinical area')
    expect(normaliseMissingKey('audit cycle stage')).toBe('audit stage')
    expect(normaliseMissingKey('Notes')).toBe('notes')
    expect(normaliseMissingKey('evidence')).toBeNull()
  })
})

describe('isMissing (portfolio)', () => {
  it('finds entries with no linked specialties (the old filter returned none)', () => {
    expect(isMissing({ specialty_tags: [] }, 'specialty tags', 'portfolio')).toBe(true)
    expect(isMissing({ specialty_tags: null }, 'tags', 'portfolio')).toBe(true)
    expect(isMissing({ specialty_tags: ['imt'] }, 'specialty tags', 'portfolio')).toBe(false)
  })

  it('does not report a reflection with reflection text as missing notes', () => {
    expect(isMissing({ category: 'reflection', notes: null, refl_free_text: 'What happened...' }, 'notes', 'portfolio')).toBe(false)
    expect(isMissing({ category: 'custom', notes: '', custom_free_text: 'Balint group' }, 'notes', 'portfolio')).toBe(false)
  })

  it('reports entries with no written content at all', () => {
    expect(isMissing({ category: 'teaching', notes: '  ', refl_free_text: null }, 'notes', 'portfolio')).toBe(true)
  })

  it('only flags audits for a missing cycle stage', () => {
    expect(isMissing({ category: 'audit_qip', audit_cycle_stage: null }, 'audit stage', 'portfolio')).toBe(true)
    expect(isMissing({ category: 'teaching', audit_cycle_stage: null }, 'audit stage', 'portfolio')).toBe(false)
  })

  it('handles competency themes', () => {
    expect(isMissing({ interview_themes: [] }, 'themes', 'portfolio')).toBe(true)
  })
})

describe('isMissing (cases)', () => {
  it('checks both clinical area columns', () => {
    expect(isMissing({ clinical_domain: null, clinical_domains: [] }, 'clinical domain', 'case')).toBe(true)
    expect(isMissing({ clinical_domain: null, clinical_domains: ['Cardiology'] }, 'clinical area', 'case')).toBe(false)
  })

  it('uses the case notes column', () => {
    expect(isMissing({ notes: '' }, 'notes', 'case')).toBe(true)
  })
})

describe('matchesParsedQuery with recordType', () => {
  const reflection = { category: 'reflection', title: 'Night shift', notes: null, refl_free_text: 'Reflection text', specialty_tags: [] }

  it('uses the real predicates', () => {
    const notes = parseSearchQuery('missing:notes')
    const tags = parseSearchQuery('')
    tags.missing = 'specialty tags'
    const opts = { recordType: 'portfolio' as const, missingFields: missingCompletenessFields(reflection, 'portfolio') }
    expect(matchesParsedQuery(reflection, notes, opts)).toBe(false)
    expect(matchesParsedQuery(reflection, tags, opts)).toBe(true)
  })

  it('falls back to the label match for unknown keys', () => {
    const parsed = parseSearchQuery('missing:title')
    expect(matchesParsedQuery({ title: '' }, parsed, { recordType: 'portfolio', missingFields: ['Title'] })).toBe(true)
  })
})

describe('missingFilterLabel', () => {
  it('names the active option for the filter banner', () => {
    expect(missingFilterLabel('specialty tags', 'portfolio')).toBe('No linked specialties')
    expect(missingFilterLabel('clinical domain', 'case')).toBe('No clinical area')
  })
})
