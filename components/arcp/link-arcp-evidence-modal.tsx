'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ARCPCapability, ARCPEntryLink } from '@/lib/types/arcp'
import { useToast } from '@/components/ui/toast-provider'

type SearchResult = {
  id: string
  title: string
  date: string
  type: 'portfolio'
}

type Props = {
  capability: ARCPCapability
  existingEntryIds: string[]
  onClose: () => void
  onLinked: (link: ARCPEntryLink) => void
}

export default function LinkARCPEvidenceModal({ capability, existingEntryIds, onClose, onLinked }: Props) {
  const supabase = createClient()
  const { addToast } = useToast()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [linking, setLinking] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('portfolio_entries')
        .select('id, title, date')
        .ilike('title', `%${query.trim()}%`)
        .is('deleted_at', null)
        .limit(8)
      setResults((data ?? [])
        .map(entry => ({ ...entry, type: 'portfolio' as const }))
        .filter(entry => !existingEntryIds.includes(entry.id))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
      setSearching(false)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [existingEntryIds, query, supabase])

  async function handleLink(result: SearchResult) {
    setLinking(true)
    const res = await fetch('/api/arcp/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capability_key: capability.capability_key,
        entry_id: result.id,
        entry_type: 'portfolio',
      }),
    })

    setLinking(false)
    if (!res.ok) {
      addToast('Failed to link evidence', 'error')
      return
    }
    onLinked(await res.json() as ARCPEntryLink)
    addToast(`Linked to ${capability.name}`, 'success')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#141416] border border-white/[0.1] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08] shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[#F5F5F2]">Link portfolio evidence</h2>
            <p className="text-xs text-[rgba(245,245,242,0.4)] mt-0.5">{capability.name}</p>
          </div>
          <button onClick={onClose} className="min-h-[44px] px-3 text-[rgba(245,245,242,0.55)]">Close</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search portfolio entries..."
            className="w-full min-h-[44px] bg-[#0B0B0C] border border-white/[0.08] rounded-xl px-4 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1B6FD9]"
          />
          {searching && <p className="py-4 text-xs text-[rgba(245,245,242,0.35)]">Searching...</p>}
          <div className="mt-4 space-y-2">
            {results.map(result => (
              <button key={result.id} onClick={() => handleLink(result)} disabled={linking} className="w-full min-h-[44px] rounded-xl bg-[#0B0B0C] border border-white/[0.06] p-3 text-left hover:border-[#1B6FD9]/40 disabled:opacity-50">
                <p className="text-sm font-medium text-[#F5F5F2]">{result.title}</p>
                <p className="text-xs text-[rgba(245,245,242,0.35)]">{new Date(result.date).toLocaleDateString('en-GB')}</p>
              </button>
            ))}
          </div>
          {!query && <p className="text-center text-xs text-[rgba(245,245,242,0.3)] py-8">Start typing to search your portfolio entries.</p>}
          {query && !searching && results.length === 0 && <p className="text-center text-xs text-[rgba(245,245,242,0.3)] py-8">No matching portfolio entries found.</p>}
        </div>
      </div>
    </div>
  )
}
