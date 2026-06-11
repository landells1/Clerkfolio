'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Snippet = {
  id: string
  shortcut: string
  body: string
}

export function useSnippets() {
  const [snippets, setSnippets] = useState<Snippet[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('snippets')
      .select('id, shortcut, body')
      .order('shortcut', { ascending: true })
      .then(({ data }) => setSnippets((data ?? []) as Snippet[]))
  }, [])

  return snippets
}

// The slash must start a word (start of text or after whitespace) so typing
// "and/or" or "24/7" mid-sentence and pressing Enter/Tab doesn't expand a
// snippet whose shortcut happens to prefix-match the trailing fragment.
const SLASH_SHORTCUT = /(?:^|\s)(\/([a-z0-9_-]*))$/i

export function findSnippetForSlash(text: string, cursor: number, snippets: Snippet[]) {
  const before = text.slice(0, cursor)
  const match = before.match(SLASH_SHORTCUT)
  if (!match) return null
  const needle = match[2].toLowerCase()
  return snippets.find(snippet => snippet.shortcut.toLowerCase().startsWith(needle)) ?? null
}

export function replaceSnippetShortcut(text: string, cursor: number, snippet: Snippet) {
  const before = text.slice(0, cursor)
  const match = before.match(SLASH_SHORTCUT)
  if (!match || match.index === undefined) return null

  // match.index points at the leading whitespace (when present); offset to
  // where the "/" itself starts so the whitespace survives the replacement.
  const slashStart = match.index + match[0].length - match[1].length
  const value = `${text.slice(0, slashStart)}${snippet.body}${text.slice(cursor)}`
  return { value, cursor: slashStart + snippet.body.length }
}
