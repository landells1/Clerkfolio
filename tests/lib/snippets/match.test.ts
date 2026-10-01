// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { activeSlashQuery, insertSnippet, matchSnippets } from '@/lib/snippets/match'

const snippets = [
  { id: '1', shortcut: 'sbar', body: 'Situation: Background: Assessment: Recommendation:' },
  { id: '2', shortcut: 'sb', body: 'Short body' },
  { id: '3', shortcut: 'reflection', body: 'What happened:' },
]

describe('activeSlashQuery', () => {
  it('finds a slash shortcut at the start or after whitespace', () => {
    expect(activeSlashQuery('/sb', 3)).toEqual({ query: 'sb', start: 0 })
    expect(activeSlashQuery('Notes /SBa', 10)).toEqual({ query: 'sba', start: 6 })
    expect(activeSlashQuery('Line one\n/', 10)).toEqual({ query: '', start: 9 })
  })

  it('ignores slashes inside words such as and/or or 24/7', () => {
    expect(activeSlashQuery('and/or', 6)).toBeNull()
    expect(activeSlashQuery('24/7', 4)).toBeNull()
  })

  it('only looks at the text before the cursor', () => {
    expect(activeSlashQuery('/sbar later', 3)).toEqual({ query: 'sb', start: 0 })
    expect(activeSlashQuery('/sbar later', 11)).toBeNull()
  })
})

describe('matchSnippets', () => {
  it('lists prefix matches, exact match first', () => {
    expect(matchSnippets(snippets, 'sb').map(s => s.shortcut)).toEqual(['sb', 'sbar'])
    expect(matchSnippets(snippets, 'SBA').map(s => s.shortcut)).toEqual(['sbar'])
  })

  it('lists everything for a bare slash, alphabetically, up to the limit', () => {
    expect(matchSnippets(snippets, '').map(s => s.shortcut)).toEqual(['reflection', 'sb', 'sbar'])
    expect(matchSnippets(snippets, '', 2)).toHaveLength(2)
  })

  it('returns nothing when no shortcut matches', () => {
    expect(matchSnippets(snippets, 'xyz')).toEqual([])
  })
})

describe('insertSnippet', () => {
  it('replaces the typed /shortcut and keeps the surrounding text', () => {
    const text = 'Handover /sba then more'
    const query = activeSlashQuery(text, 13)!
    expect(insertSnippet(text, 13, query.start, 'SBAR body')).toEqual({ value: 'Handover SBAR body then more', cursor: 18 })
  })
})
