'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Result = {
  id: string
  title: string
  type: 'entry' | 'case' | 'logbook'
  subtitle: string
}

export default function GlobalSearch({ onClose }: { onClose: () => void }) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [selected, setSelected] = useState(0)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); setSearchError(false); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      setSearchError(false)
      try {
        const [entriesResult, casesResult, logbookResult] = await Promise.all([
          supabase.from('portfolio_entries').select('id, title, category').ilike('title', `%${q.trim()}%`).is('deleted_at', null).limit(5),
          supabase.from('cases').select('id, title, clinical_domain').ilike('title', `%${q.trim()}%`).is('deleted_at', null).limit(5),
          supabase.from('logbook_entries').select('id, procedure_name, surgical_specialty').ilike('procedure_name', `%${q.trim()}%`).is('deleted_at', null).limit(5),
        ])
        if (entriesResult.error || casesResult.error || logbookResult.error) {
          setSearchError(true)
          setResults([])
        } else {
          const r: Result[] = [
            ...(entriesResult.data ?? []).map(e => ({ id: e.id, title: e.title, type: 'entry' as const, subtitle: e.category?.replace(/_/g, ' ') ?? 'Portfolio entry' })),
            ...(casesResult.data ?? []).map(c => ({ id: c.id, title: c.title, type: 'case' as const, subtitle: c.clinical_domain ?? 'Case' })),
            ...(logbookResult.data ?? []).map(e => ({ id: e.id, title: e.procedure_name, type: 'logbook' as const, subtitle: e.surgical_specialty ?? 'Logbook' })),
          ]
          setResults(r)
          setSelected(0)
        }
      } catch {
        setSearchError(true)
        setResults([])
      }
      setLoading(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [q, supabase])

  const navigate = useCallback((result: Result) => {
    const path =
      result.type === 'entry'
        ? `/portfolio/${result.id}`
        : result.type === 'case'
          ? `/cases/${result.id}`
          : '/logbook'
    router.push(path)
    onClose()
  }, [onClose, router])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && results[selected]) { navigate(results[selected]) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, onClose, results, selected])

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#141416] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search portfolio, cases, and logbook..."
            className="flex-1 bg-transparent text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.3)] outline-none"
          />
          <kbd className="text-[10px] text-[rgba(245,245,242,0.3)] bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.08]">Esc</kbd>
        </div>

        {/* Results */}
        {q.trim().length >= 2 && (
          <div className="py-2 max-h-80 overflow-y-auto">
            {loading && <p className="text-xs text-[rgba(245,245,242,0.4)] px-4 py-3">Searching...</p>}
            {!loading && searchError && <p className="text-xs text-red-400 px-4 py-3">Search failed. Please try again.</p>}
            {!loading && !searchError && results.length === 0 && <p className="text-xs text-[rgba(245,245,242,0.4)] px-4 py-3">No active results for &ldquo;{q}&rdquo; - deleted items won&apos;t appear here</p>}
            {results.map((r, i) => (
              <button
                key={r.id}
                onClick={() => navigate(r)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === selected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'}`}
              >
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border flex-shrink-0 capitalize ${
                  r.type === 'case'
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                    : r.type === 'logbook'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                }`}>
                  {r.type === 'case' ? 'Case' : r.type === 'logbook' ? 'Logbook' : r.subtitle}
                </span>
                <span className="text-sm text-[rgba(245,245,242,0.8)] truncate">{r.title}</span>
              </button>
            ))}
          </div>
        )}

        {q.trim().length < 2 && (
          <div className="px-4 py-3">
            <p className="text-xs text-[rgba(245,245,242,0.3)]">Type to search across your portfolio, cases, and logbook</p>
          </div>
        )}
      </div>
    </div>
  )
}
