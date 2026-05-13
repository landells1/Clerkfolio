'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, type Category } from '@/lib/types/portfolio'

type Result = {
  id: string
  title: string
  type: 'entry' | 'case'
  subtitle: string
}

const COMMANDS = [
  { keys: 'g d', label: 'Dashboard', href: '/dashboard' },
  { keys: 'g p', label: 'Portfolio', href: '/portfolio' },
  { keys: 'g c', label: 'Cases', href: '/cases' },
  { keys: 'g s', label: 'Specialties', href: '/specialties' },
  { keys: 'g t', label: 'Timeline', href: '/timeline' },
  { keys: 'g a', label: 'ARCP', href: '/arcp' },
  { keys: 'g e', label: 'Share & Export', href: '/export' },
  { keys: 'g r', label: 'Rotations & training', href: '/logs' },
  { keys: 'g x', label: 'Settings', href: '/settings' },
  { keys: 'n', label: 'New portfolio entry', href: '/portfolio/new' },
  { keys: 'c', label: 'New case', href: '/cases/new' },
  { keys: '?', label: 'Help & glossary', href: '/help' },
]

export default function GlobalSearch({ onClose }: { onClose: () => void }) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [selected, setSelected] = useState(0)
  const normalizedQuery = q.trim().toLowerCase()
  const matchingCommands = useMemo(
    () => normalizedQuery.length >= 2
      ? COMMANDS.filter(command =>
        command.keys.toLowerCase() === normalizedQuery ||
        command.label.toLowerCase().includes(normalizedQuery)
      )
      : [],
    [normalizedQuery]
  )

  useEffect(() => {
    setSelected(0)
  }, [normalizedQuery])

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); setSearchError(false); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      setSearchError(false)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setSearchError(true)
          setResults([])
          setLoading(false)
          return
        }
        const [entriesResult, casesResult, filesResult] = await Promise.all([
          supabase.from('portfolio_entries').select('id, title, category').eq('user_id', user.id).ilike('title', `%${q.trim()}%`).is('deleted_at', null).limit(5),
          supabase.from('cases').select('id, title, clinical_domain, clinical_domains').eq('user_id', user.id).ilike('title', `%${q.trim()}%`).is('deleted_at', null).limit(5),
          supabase.from('evidence_files').select('entry_id, entry_type, file_name').eq('user_id', user.id).ilike('file_name', `%${q.trim()}%`).limit(5),
        ])
        if (entriesResult.error || casesResult.error || filesResult.error) {
          setSearchError(true)
          setResults([])
        } else {
          const files = filesResult.data ?? []
          const portfolioFileIds = files.filter(file => file.entry_type !== 'case').map(file => file.entry_id)
          const caseFileIds = files.filter(file => file.entry_type === 'case').map(file => file.entry_id)
          const [activeFileEntries, activeFileCases] = await Promise.all([
            portfolioFileIds.length
              ? supabase.from('portfolio_entries').select('id').eq('user_id', user.id).in('id', portfolioFileIds).is('deleted_at', null)
              : Promise.resolve({ data: [], error: null }),
            caseFileIds.length
              ? supabase.from('cases').select('id').eq('user_id', user.id).in('id', caseFileIds).is('deleted_at', null)
              : Promise.resolve({ data: [], error: null }),
          ])
          if (activeFileEntries.error || activeFileCases.error) {
            setSearchError(true)
            setResults([])
            setLoading(false)
            return
          }
          const activePortfolioFileIds = new Set((activeFileEntries.data ?? []).map(row => row.id))
          const activeCaseFileIds = new Set((activeFileCases.data ?? []).map(row => row.id))
          const r: Result[] = [
            ...(entriesResult.data ?? []).map(e => ({
              id: e.id,
              title: e.title,
              type: 'entry' as const,
              subtitle: CATEGORIES.find(c => c.value === (e.category as Category))?.label ?? 'Portfolio entry',
            })),
            ...(casesResult.data ?? []).map(c => {
              const domains = c.clinical_domains?.length ? c.clinical_domains : c.clinical_domain ? [c.clinical_domain] : []
              return { id: c.id, title: c.title, type: 'case' as const, subtitle: domains.join(', ') || 'Case' }
            }),
            ...files.filter(file =>
              file.entry_type === 'case'
                ? activeCaseFileIds.has(file.entry_id)
                : activePortfolioFileIds.has(file.entry_id)
            ).map(file => ({
              id: file.entry_id,
              title: file.file_name,
              type: file.entry_type === 'case' ? 'case' as const : 'entry' as const,
              subtitle: 'Evidence file',
            })),
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
        : `/cases/${result.id}`
    router.push(path)
    onClose()
  }, [onClose, router])

  const runCommand = useCallback((href: string) => {
    if (href !== '#') router.push(href)
    onClose()
  }, [onClose, router])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      const resultCount = matchingCommands.length + results.length
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, Math.max(resultCount - 1, 0))) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter') {
        const command = matchingCommands[selected]
        if (command) {
          e.preventDefault()
          runCommand(command.href)
          return
        }
        const result = results[selected - matchingCommands.length]
        if (result) {
          e.preventDefault()
          navigate(result)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [matchingCommands, navigate, onClose, results, runCommand, selected])

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
            placeholder="Search entries or run a command..."
            className="flex-1 bg-transparent text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.55)] outline-none"
          />
          <kbd className="text-[10px] text-[rgba(245,245,242,0.55)] bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.08]">Esc</kbd>
        </div>

        {/* Results */}
        {q.trim().length >= 2 && (
          <div className="py-2 max-h-80 overflow-y-auto">
            {loading && <p className="text-xs text-[rgba(245,245,242,0.4)] px-4 py-3">Searching...</p>}
            {!loading && searchError && <p className="text-xs text-red-400 px-4 py-3">Search failed. Please try again.</p>}
            {!loading && !searchError && matchingCommands.length === 0 && results.length === 0 && <p className="text-xs text-[rgba(245,245,242,0.4)] px-4 py-3">No active results for &ldquo;{q}&rdquo; - deleted items won&apos;t appear here</p>}
            {matchingCommands.map((command, i) => (
              <button
                key={command.keys}
                onClick={() => runCommand(command.href)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${i === selected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'}`}
              >
                <span className="text-sm text-[rgba(245,245,242,0.8)] truncate">{command.label}</span>
                <kbd className="rounded border border-white/[0.08] bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-[rgba(245,245,242,0.45)]">{command.keys}</kbd>
              </button>
            ))}
            {results.map((r, i) => (
              <button
                key={r.id}
                onClick={() => navigate(r)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i + matchingCommands.length === selected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'}`}
              >
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border flex-shrink-0 capitalize ${
                  r.type === 'case'
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                      : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                }`}>
                  {r.type === 'case' ? 'Case' : r.subtitle}
                </span>
                <span className="text-sm text-[rgba(245,245,242,0.8)] truncate">{r.title}</span>
              </button>
            ))}
          </div>
        )}

        {q.trim().length < 2 && (
          <div className="px-4 py-3">
            <p className="mb-3 text-xs text-[rgba(245,245,242,0.55)]">Type to search across your portfolio and cases</p>
            <div className="grid gap-1">
              {COMMANDS.map(command => (
                <button
                  key={command.keys}
                  onClick={() => {
                  if (command.href !== '#') router.push(command.href)
                  onClose()
                  }}
                  className="flex min-h-[36px] items-center justify-between rounded-lg px-2 text-left text-xs text-[rgba(245,245,242,0.58)] hover:bg-white/[0.04] hover:text-[#F5F5F2]"
                >
                  <span>{command.label}</span>
                  <kbd className="rounded border border-white/[0.08] bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-[rgba(245,245,242,0.45)]">{command.keys}</kbd>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
