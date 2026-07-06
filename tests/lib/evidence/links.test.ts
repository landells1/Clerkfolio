// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  decideUnlink,
  filesToDeleteAfterEntriesRemoved,
  distinctStorageBytes,
  type EvidenceLinkRef,
} from '@/lib/evidence/links'

const link = (id: string, type: 'portfolio' | 'case' = 'portfolio'): EvidenceLinkRef => ({
  entry_id: id,
  entry_type: type,
})

describe('decideUnlink', () => {
  it('deletes the file when unlinking its only (last) link', () => {
    const result = decideUnlink([link('e1')], 'e1', 'portfolio')
    expect(result).toEqual({ linkExists: true, deleteFile: true, remainingLinkCount: 0 })
  })

  it('keeps the file when other links remain (plain unlink)', () => {
    const result = decideUnlink([link('e1'), link('e2')], 'e1', 'portfolio')
    expect(result).toEqual({ linkExists: true, deleteFile: false, remainingLinkCount: 1 })
  })

  it('does not delete when the link does not exist', () => {
    const result = decideUnlink([link('e1')], 'e2', 'portfolio')
    expect(result).toEqual({ linkExists: false, deleteFile: false, remainingLinkCount: 1 })
  })

  it('distinguishes entry_type — same id, different type is a different link', () => {
    const links = [link('shared', 'portfolio'), link('shared', 'case')]
    // Unlinking the portfolio side leaves the case link -> keep the file.
    const portfolioSide = decideUnlink(links, 'shared', 'portfolio')
    expect(portfolioSide).toEqual({ linkExists: true, deleteFile: false, remainingLinkCount: 1 })
    // Removing an id/type combo that isn't present does nothing.
    const absent = decideUnlink(links, 'shared', 'portfolio' as const)
    expect(absent.linkExists).toBe(true)
  })

  it('deletes only after the true last link across three entries', () => {
    let links = [link('e1'), link('e2'), link('e3')]
    const first = decideUnlink(links, 'e1', 'portfolio')
    expect(first.deleteFile).toBe(false)
    links = links.filter(l => l.entry_id !== 'e1')
    const second = decideUnlink(links, 'e2', 'portfolio')
    expect(second.deleteFile).toBe(false)
    links = links.filter(l => l.entry_id !== 'e2')
    const third = decideUnlink(links, 'e3', 'portfolio')
    expect(third.deleteFile).toBe(true)
  })
})

describe('filesToDeleteAfterEntriesRemoved', () => {
  it('orphans a file whose every link points at a doomed entry', () => {
    const linksByFile = new Map<string, EvidenceLinkRef[]>([
      ['fileA', [link('e1'), link('e2')]],
    ])
    const { orphanedFileIds, keptFileIds } = filesToDeleteAfterEntriesRemoved(
      linksByFile,
      [link('e1'), link('e2')],
    )
    expect(orphanedFileIds).toEqual(['fileA'])
    expect(keptFileIds).toEqual([])
  })

  it('keeps a file still linked to a surviving entry', () => {
    const linksByFile = new Map<string, EvidenceLinkRef[]>([
      ['fileA', [link('e1'), link('survivor')]],
    ])
    const { orphanedFileIds, keptFileIds } = filesToDeleteAfterEntriesRemoved(
      linksByFile,
      [link('e1')], // only e1 is doomed; survivor stays
    )
    expect(orphanedFileIds).toEqual([])
    expect(keptFileIds).toEqual(['fileA'])
  })

  it('handles a mix of orphaned and kept files, order-independent across types', () => {
    const linksByFile = new Map<string, EvidenceLinkRef[]>([
      ['orphan', [link('caseX', 'case'), link('entryY', 'portfolio')]],
      ['kept', [link('caseX', 'case'), link('liveZ', 'portfolio')]],
    ])
    const { orphanedFileIds, keptFileIds } = filesToDeleteAfterEntriesRemoved(
      linksByFile,
      [link('caseX', 'case'), link('entryY', 'portfolio')],
    )
    expect(orphanedFileIds).toEqual(['orphan'])
    expect(keptFileIds).toEqual(['kept'])
  })
})

describe('distinctStorageBytes — quota counts each physical file once', () => {
  it('counts a file once even if referenced multiple times', () => {
    // Same physical file id appearing several times (e.g. joined per link) must
    // not be double-counted toward quota.
    const files = [
      { id: 'f1', file_size: 1000 },
      { id: 'f1', file_size: 1000 },
      { id: 'f2', file_size: 500 },
    ]
    expect(distinctStorageBytes(files)).toBe(1500)
  })

  it('sums distinct files', () => {
    expect(distinctStorageBytes([
      { id: 'a', file_size: 100 },
      { id: 'b', file_size: 200 },
      { id: 'c', file_size: 300 },
    ])).toBe(600)
  })

  it('is zero for no files', () => {
    expect(distinctStorageBytes([])).toBe(0)
  })
})
