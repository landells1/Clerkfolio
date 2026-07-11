// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  buildCaseTemplateFieldDefaults,
  clinicalDomainsFromDefaults,
  notesScaffoldFromDefaults,
} from '@/lib/templates/case-defaults'

describe('buildCaseTemplateFieldDefaults', () => {
  it('captures the clinical areas', () => {
    expect(buildCaseTemplateFieldDefaults({ clinical_domains: ['Cardiology', 'Acute Medicine'] }))
      .toEqual({ clinical_domains: ['Cardiology', 'Acute Medicine'] })
  })

  it('falls back to the legacy single clinical_domain column', () => {
    expect(buildCaseTemplateFieldDefaults({ clinical_domains: [], clinical_domain: 'Paediatrics' }))
      .toEqual({ clinical_domains: ['Paediatrics'] })
  })

  it('returns empty defaults when the case has no clinical areas', () => {
    expect(buildCaseTemplateFieldDefaults({ clinical_domains: [], clinical_domain: null })).toEqual({})
  })

  it('never captures notes free text (clinical narrative stays out of templates)', () => {
    const withNotes = { clinical_domains: ['Oncology'], notes: 'sensitive clinical narrative' }
    expect(buildCaseTemplateFieldDefaults(withNotes)).toEqual({ clinical_domains: ['Oncology'] })
  })
})

describe('clinicalDomainsFromDefaults', () => {
  it('reads a string array back out', () => {
    expect(clinicalDomainsFromDefaults({ clinical_domains: ['Urology'] })).toEqual(['Urology'])
  })

  it('returns empty for a missing or non-array value', () => {
    expect(clinicalDomainsFromDefaults({})).toEqual([])
    expect(clinicalDomainsFromDefaults({ clinical_domains: 'Urology' })).toEqual([])
    expect(clinicalDomainsFromDefaults({ clinical_domains: true })).toEqual([])
  })

  it('drops non-string members from a malformed stored array', () => {
    expect(clinicalDomainsFromDefaults({ clinical_domains: ['Urology', 3, 'ITU'] as unknown as string[] }))
      .toEqual(['Urology', 'ITU'])
  })
})

describe('notesScaffoldFromDefaults', () => {
  const scaffold = 'Presentation (anonymised):\n\nOutcome:'

  it('returns the scaffold when the notes box is empty', () => {
    expect(notesScaffoldFromDefaults({ notes: scaffold }, '')).toBe(scaffold)
    expect(notesScaffoldFromDefaults({ notes: scaffold }, '   \n ')).toBe(scaffold)
  })

  it('never overwrites notes the user has already typed', () => {
    expect(notesScaffoldFromDefaults({ notes: scaffold }, 'my own write-up')).toBeNull()
  })

  it('returns null when the template has no usable notes default', () => {
    expect(notesScaffoldFromDefaults({}, '')).toBeNull()
    expect(notesScaffoldFromDefaults({ notes: '   ' }, '')).toBeNull()
    expect(notesScaffoldFromDefaults({ notes: 42 }, '')).toBeNull()
  })
})
