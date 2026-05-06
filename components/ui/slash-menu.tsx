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

export function findSnippetForSlash(text: string, cursor: number, snippets: Snippet[]) {
  const before = text.slice(0, cursor)
  const match = before.match(/\/([a-z0-9_-]*)$/i)
  if (!match) return null
  const needle = match[1].toLowerCase()
  return snippets.find(snippet => snippet.shortcut.toLowerCase().startsWith(needle)) ?? null
}
