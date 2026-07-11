// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { attachTitlesToLibrary } from '@/lib/evidence/server'
import type { EvidenceFile } from '@/lib/supabase/storage'
import type { EvidenceEntryType } from '@/lib/evidence/links'

const file = (id: string, overrides: Partial<EvidenceFile> = {}): EvidenceFile => ({
  id,
  file_name: `${id}.pdf`,
  file_path: `user/${id}.pdf`,
  file_size: 1000,
  mime_type: 'application/pdf',
  scan_status: 'clean',
  created_at: '2026-07-01T00:00:00Z',
  ...overrides,
})

const link = (fileId: string, entryId: string, entryType: EvidenceEntryType = 'portfolio') => ({
  file_id: fileId,
  entry_id: entryId,
  entry_type: entryType,
})

const titles = (
  portfolio: [string, string][] = [],
  cases: [string, string][] = [],
): Record<EvidenceEntryType, Map<string, string>> => ({
  portfolio: new Map(portfolio),
  case: new Map(cases),
})

describe('attachTitlesToLibrary', () => {
  it('groups links per file and resolves titles from the right per-type lookup', () => {
    const result = attachTitlesToLibrary(
      [file('f1'), file('f2')],
      [link('f1', 'e1'), link('f1', 'c1', 'case'), link('f2', 'e2')],
      titles([['e1', 'Audit entry'], ['e2', 'Teaching entry']], [['c1', 'Chest pain case']]),
    )
    expect(result.map(f => f.id)).toEqual(['f1', 'f2'])
    expect(result[0].links).toEqual([
      { entry_id: 'e1', entry_type: 'portfolio', title: 'Audit entry' },
      { entry_id: 'c1', entry_type: 'case', title: 'Chest pain case' },
    ])
    expect(result[1].links).toEqual([
      { entry_id: 'e2', entry_type: 'portfolio', title: 'Teaching entry' },
    ])
  })

  it('keeps a link whose entry is missing from the lookup, with title null (trashed entry)', () => {
    const result = attachTitlesToLibrary(
      [file('f1')],
      [link('f1', 'live'), link('f1', 'trashed')],
      titles([['live', 'Still here']]),
    )
    expect(result[0].links).toEqual([
      { entry_id: 'live', entry_type: 'portfolio', title: 'Still here' },
      { entry_id: 'trashed', entry_type: 'portfolio', title: null },
    ])
  })

  it('does not resolve a portfolio id from the case lookup (same id, different type)', () => {
    const result = attachTitlesToLibrary(
      [file('f1')],
      [link('f1', 'shared', 'portfolio'), link('f1', 'shared', 'case')],
      titles([], [['shared', 'Case title']]),
    )
    expect(result[0].links).toEqual([
      { entry_id: 'shared', entry_type: 'portfolio', title: null },
      { entry_id: 'shared', entry_type: 'case', title: 'Case title' },
    ])
  })

  it('gives a file with no links an empty links array and preserves file order', () => {
    const result = attachTitlesToLibrary(
      [file('newest'), file('orphan'), file('oldest')],
      [link('newest', 'e1'), link('oldest', 'e2')],
      titles([['e1', 'A'], ['e2', 'B']]),
    )
    expect(result.map(f => f.id)).toEqual(['newest', 'orphan', 'oldest'])
    expect(result[1].links).toEqual([])
  })

  it('passes the file row through unchanged (size/status stay intact for the UI)', () => {
    const quarantined = file('f1', { scan_status: 'quarantined', file_size: 5_000_000 })
    const [result] = attachTitlesToLibrary([quarantined], [], titles())
    expect(result.scan_status).toBe('quarantined')
    expect(result.file_size).toBe(5_000_000)
    expect(result.file_name).toBe('f1.pdf')
  })

  it('handles empty inputs', () => {
    expect(attachTitlesToLibrary([], [], titles())).toEqual([])
  })
})
