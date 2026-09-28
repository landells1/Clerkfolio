import { describe, it, expect } from 'vitest'
import { cvCategoryOrder, resolveSectionOrder } from '@/lib/export/cv-category-order'
import { buildCvDocSections } from '@/lib/export/cv-docx'
import type { PortfolioEntry } from '@/lib/types/portfolio'

const entry = (category: string, title: string) => ({ id: title, title, category, date: '2026-01-01', specialty_tags: [] }) as unknown as PortfolioEntry

describe('CV section order', () => {
  it('puts the requested order first and never drops a canonical category', () => {
    expect(resolveSectionOrder(['a', 'b', 'c'] as const, ['c', 'x', 'c'])).toEqual(['c', 'a', 'b'])
    expect(resolveSectionOrder(['a', 'b'] as const, null)).toEqual(['a', 'b'])
  })

  it('falls back to the clinical template for unknown keys', () => {
    expect(cvCategoryOrder('nope')).toEqual(cvCategoryOrder('clinical'))
  })

  it('orders DOCX sections by the chosen template', () => {
    const entries = [entry('audit_qip', 'Audit'), entry('publication', 'Paper')]
    expect(buildCvDocSections(entries, cvCategoryOrder('academic')).map(s => s.category)).toEqual(['publication', 'audit_qip'])
    expect(buildCvDocSections(entries).map(s => s.category)).toEqual(['audit_qip', 'publication'])
  })
})
