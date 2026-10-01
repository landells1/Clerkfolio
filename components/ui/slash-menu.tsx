'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Snippet } from '@/lib/snippets/match'

// One fetch of the user's snippets per page load, shared by every snippet
// textarea on the page (an entry form can render several). Settings >
// Snippets calls invalidateSnippets() after a change so the next form picks
// up the new list.
let cached: Promise<Snippet[]> | null = null

function loadSnippets(): Promise<Snippet[]> {
  if (!cached) {
    const supabase = createClient()
    cached = Promise.resolve(
      supabase
        .from('snippets')
        .select('id, shortcut, body')
        .order('shortcut', { ascending: true })
    ).then(({ data }) => (data ?? []) as Snippet[], () => [] as Snippet[])
  }
  return cached
}

export function invalidateSnippets() {
  cached = null
}

export function useSnippets() {
  const [snippets, setSnippets] = useState<Snippet[]>([])

  useEffect(() => {
    let alive = true
    loadSnippets().then(list => { if (alive) setSnippets(list) })
    return () => { alive = false }
  }, [])

  return snippets
}
