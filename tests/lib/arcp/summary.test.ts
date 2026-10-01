// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { arcpLinkSummary, linksInRotation } from '@/lib/arcp/summary'

describe('arcpLinkSummary', () => {
  it('counts links and DISTINCT entries (one entry on two capabilities is one entry)', () => {
    const links = [
      { entry_id: 'a', entry_type: 'portfolio' as const },
      { entry_id: 'a', entry_type: 'portfolio' as const },
      { entry_id: 'b', entry_type: 'portfolio' as const },
    ]
    expect(arcpLinkSummary(links)).toBe('3 links across 2 entries')
  })

  it('names cases separately and handles singulars', () => {
    expect(arcpLinkSummary([
      { entry_id: 'a', entry_type: 'portfolio' as const },
      { entry_id: 'c', entry_type: 'case' as const },
    ])).toBe('2 links across 1 entry and 1 case')
    expect(arcpLinkSummary([])).toBe('0 links across 0 entries')
  })
})

describe('linksInRotation', () => {
  it('keeps links whose entry is dated inside the rotation span', () => {
    const span = { id: 'r', title: 'GS', detail: null, start: '2026-04-01', end: '2026-07-31' }
    const links = [
      { entry_id: 'in', entry_type: 'portfolio' as const, entry_date: '2026-05-01' },
      { entry_id: 'out', entry_type: 'portfolio' as const, entry_date: '2026-08-01' },
      { entry_id: 'undated', entry_type: 'case' as const, entry_date: null },
    ]
    expect(linksInRotation(links, span, '2026-10-01').map(l => l.entry_id)).toEqual(['in'])
  })
})
