// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { hasActiveFilters, legacyFilterStorageKey, stripNavParams } from '@/lib/search/filter-persistence'

describe('stripNavParams', () => {
  it('drops view and category but keeps real filters', () => {
    expect(stripNavParams('category=custom&q=audit&view=all')).toBe('q=audit')
  })

  it('returns empty string when only navigational params are present', () => {
    expect(stripNavParams('category=custom')).toBe('')
    expect(stripNavParams('view=all')).toBe('')
  })

  it('preserves non-navigational filters untouched', () => {
    expect(stripNavParams('q=teaching&complete=1&missing=notes')).toBe('q=teaching&complete=1&missing=notes')
  })
})

describe('hasActiveFilters', () => {
  it('is false for the bare page and for navigation-only params', () => {
    expect(hasActiveFilters('')).toBe(false)
    expect(hasActiveFilters('view=themes&category=teaching')).toBe(false)
  })

  it('is true for a real filter such as a stale theme search', () => {
    expect(hasActiveFilters('q=theme%3ACommunication')).toBe(true)
    expect(hasActiveFilters('missing=notes')).toBe(true)
  })
})

describe('legacyFilterStorageKey', () => {
  it('matches the key the retired persistence wrote, so it can be cleared', () => {
    expect(legacyFilterStorageKey('/portfolio')).toBe('clerkfolio-filters:/portfolio')
  })
})
