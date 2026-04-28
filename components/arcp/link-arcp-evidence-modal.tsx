'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ARCPCapability, ARCPEntryLink } from '@/lib/types/arcp'
import { useToast } from '@/components/ui/toast-provider'

type SearchResult = {
  id: string
  title: string
  date: string
  type: 'portfolio' | 'case'
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
      const [{ data: portfolioData }, { data: caseData }] = await Promise.all([
        supabase
          .from('portfolio_entries')
          .select('id, title, date')
          .ilike('title', `%${query.trim()}%`)
          .is('deleted_at', null)
          .limit(8),
        supabase
          .from('cases')
          .select('id, title, date')
          .ilike('title', `%${query.trim()}%`)
          .is('deleted_at', null)
          .limit(8),
      ])
      const combined: SearchResult[] = [
        ...(portfolioData ?? []).map(e => ({ ...e, type: 'portfolio' as const })),
        ...(caseData ?? []).map(e => ({ ...e, type: 'case' as const })),
      ]
        .filter(e => !existingEntryIds.includes(e.id))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setResults(combined)
      setSearching(false)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  async function handleLink(result: SearchResult) {
    setLinking(true)
    const res = await fetch('/api/arcp/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capability_key: capability.capability_key,
        entry_id: result.id,
        entry_type: result.type,
      }),
    })

    if (!res.ok) {
      addToast('Failed to link evidence', 'error')
    } else {
      const data = await res.json()
      onLinked(data as ARCPEntryLink)
      addToast(`Linked to ${capability.name}`, 'success')
      onClose()
    }
    setLinking(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#141416] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08] shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[#F5F5F2]">Link evidence</h2>
            <p className="text-xs text-[rgba(245,245,242,0.4)] mt-0.5">{capability.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] hover:bg-white/[0.06] transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Search */}
          <div className="relative mb-4">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search portfolio entries and cases…"
              className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1B6FD9] transition-colors"
            />
            {searching && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-[#1B6FD9] border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {results.length > 0 ? (
            <div className="space-y-1.5">
              {results.map(result => (
                <button
                  key={result.id}
                  onClick={() => handleLink(result)}
                  disabled={linking}
                  className="w-full flex items-start gap-3 p-3 bg-[#0B0B0C] border border-white/[0.06] hover:border-[#1B6FD9]/40 rounded-xl text-left transition-all disabled:opacity-50 group"
                >
                  <span className="text-base mt-0.5 shrink-0">{result.type === 'case' ? '💼' : '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#F5F5F2] font-medium truncate">{result.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[rgba(245,245,242,0.35)]">
                        {new Date(result.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[rgba(245,245,242,0.35)] text-xs capitalize">
                        {result.type}
                      </span>
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-1 group-hover:stroke-[#1B6FD9] transition-colors">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              ))}
            </div>
          ) : query && !searching ? (
            <p className="text-center text-xs text-[rgba(245,245,242,0.3)] py-8">No matching entries found.</p>
          ) : !query ? (
            <p className="text-center text-xs text-[rgba(245,245,242,0.3)] py-8">
              Start typing to search your portfolio entries and cases.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
