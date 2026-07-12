// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { EXPORT_PRESELECT_STORAGE_KEY, parseExportPreselect } from '@/lib/export/preselect'

describe('parseExportPreselect', () => {
  const knownIds = new Set(['a', 'b', 'c'])

  it('returns the known IDs present in a valid JSON array', () => {
    expect(parseExportPreselect(JSON.stringify(['a', 'c']), knownIds)).toEqual(['a', 'c'])
  })

  it('drops IDs that do not match a loaded entry', () => {
    expect(parseExportPreselect(JSON.stringify(['a', 'unknown-id']), knownIds)).toEqual(['a'])
  })

  it('drops non-string members instead of throwing', () => {
    expect(parseExportPreselect(JSON.stringify(['a', 42, null, { id: 'b' }]), knownIds)).toEqual(['a'])
  })

  it('returns an empty array for malformed JSON', () => {
    expect(parseExportPreselect('{not valid json', knownIds)).toEqual([])
  })

  it('returns an empty array for a non-array JSON payload', () => {
    expect(parseExportPreselect(JSON.stringify({ a: 1 }), knownIds)).toEqual([])
    expect(parseExportPreselect(JSON.stringify('a'), knownIds)).toEqual([])
    expect(parseExportPreselect(JSON.stringify(42), knownIds)).toEqual([])
  })

  it('returns an empty array for null/undefined/empty-string input', () => {
    expect(parseExportPreselect(null, knownIds)).toEqual([])
    expect(parseExportPreselect(undefined, knownIds)).toEqual([])
    expect(parseExportPreselect('', knownIds)).toEqual([])
  })

  it('returns an empty array when nothing in the payload matches', () => {
    expect(parseExportPreselect(JSON.stringify(['x', 'y']), knownIds)).toEqual([])
  })

  it('exports the shared sessionStorage key used by the write side', () => {
    expect(EXPORT_PRESELECT_STORAGE_KEY).toBe('clerkfolio-export-preselect')
  })
})
