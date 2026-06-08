// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { resolveFilterPersistence, stripNavParams } from '@/lib/search/filter-persistence'

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

describe('resolveFilterPersistence', () => {
  // BUG-008: bare /portfolio (or a "back to all" link to it) must never be bounced
  // back into the last category, even if localStorage was poisoned by the old code.
  it('does not restore a stored category on a bare URL (no navigation trap)', () => {
    expect(resolveFilterPersistence('', 'category=custom')).toEqual({ action: 'none' })
  })

  it('does not restore a stored view on a bare URL', () => {
    expect(resolveFilterPersistence('', 'view=all')).toEqual({ action: 'none' })
  })

  it('does nothing on a bare URL when nothing is stored', () => {
    expect(resolveFilterPersistence('', null)).toEqual({ action: 'none' })
    expect(resolveFilterPersistence('', '')).toEqual({ action: 'none' })
  })

  it('restores genuine filters on a bare URL (remember-filters feature kept)', () => {
    expect(resolveFilterPersistence('', 'q=audit')).toEqual({ action: 'restore', params: 'q=audit' })
  })

  it('strips navigation out of a legacy stored value before restoring', () => {
    expect(resolveFilterPersistence('', 'category=custom&q=audit')).toEqual({ action: 'restore', params: 'q=audit' })
  })

  it('persists filters but never navigation when the URL has params', () => {
    expect(resolveFilterPersistence('category=custom&q=audit', null)).toEqual({ action: 'persist', params: 'q=audit' })
  })

  it('persists an empty filter set when only navigation is present (clears poison)', () => {
    expect(resolveFilterPersistence('category=custom', 'q=old')).toEqual({ action: 'persist', params: '' })
  })
})
