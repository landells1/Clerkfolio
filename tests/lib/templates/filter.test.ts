// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { caseTemplates, portfolioTemplates } from '@/lib/templates/filter'
import type { Template } from '@/lib/types/templates'

function template(overrides: Record<string, unknown>): Template {
  return {
    id: 'id',
    user_id: null,
    name: 'A template',
    description: null,
    field_defaults: {},
    guidance_prompts: {},
    is_curated: false,
    created_at: '2026-07-11T00:00:00Z',
    entry_type: 'portfolio',
    category: 'audit_qip',
    ...overrides,
  } as Template
}

describe('template entry_type filtering', () => {
  const portfolio = template({ id: 'p1', entry_type: 'portfolio', category: 'teaching' })
  const caseT = template({ id: 'c1', entry_type: 'case', category: 'case' })
  const mixed = [portfolio, caseT]

  it('the entry picker only ever sees portfolio templates', () => {
    expect(portfolioTemplates(mixed)).toEqual([portfolio])
  })

  it('the case picker only ever sees case templates', () => {
    expect(caseTemplates(mixed)).toEqual([caseT])
  })

  it('treats rows without an entry_type as portfolio (pre-migration shape)', () => {
    // Rows read before the discriminator existed can only be portfolio
    // templates; the migration backfills them via the column default.
    const legacy = template({ id: 'legacy', entry_type: undefined })
    expect(portfolioTemplates([legacy, caseT])).toEqual([legacy])
    expect(caseTemplates([legacy, caseT])).toEqual([caseT])
  })

  it('the two filters partition the list - no template shows in both pickers', () => {
    const all = [portfolio, caseT, template({ id: 'p2' }), template({ id: 'c2', entry_type: 'case', category: 'case' })]
    const p = portfolioTemplates(all)
    const c = caseTemplates(all)
    expect(p.length + c.length).toBe(all.length)
    const pIds = new Set(p.map(t => t.id))
    expect(c.some(t => pIds.has(t.id))).toBe(false)
  })
})
