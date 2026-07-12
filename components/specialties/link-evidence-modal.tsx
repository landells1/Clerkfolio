'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SpecialtyDomain, SpecialtyEntryLink } from '@/lib/specialties'

type SearchResult = {
  id: string
  title: string
  date: string
  type: 'portfolio' | 'case'
}

type Props = {
  domain: SpecialtyDomain
  applicationId: string
  specialtyName: string
  existingEntryIds: string[]
  onClose: () => void
  onLinked: (link: SpecialtyEntryLink) => void
}

export function LinkEvidenceModal({
  domain,
  applicationId,
  existingEntryIds,
  onClose,
  onLinked,
}: Props) {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)
  const [selectedBand, setSelectedBand] = useState('')
  const [linking, setLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Requests are sequenced by generation: a slow earlier search response can
  // resolve after a newer one if the user keeps typing - without this, the
  // slower response would overwrite the fresher results (last-write-wins).
  // Stale completions no-op instead (audit L-3/L-4 pattern).
  const searchGeneration = useRef(0)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      const generation = ++searchGeneration.current
      const isStale = () => searchGeneration.current !== generation
      setSearching(true)
      try {
        const [{ data: portfolioData }, { data: caseData }] = await Promise.all([
          supabase
            .from('portfolio_entries')
            .select('id, title, date')
            .ilike('title', `%${query}%`)
            .is('deleted_at', null)
            .limit(8),
          supabase
            .from('cases')
            .select('id, title, date')
            .ilike('title', `%${query}%`)
            .is('deleted_at', null)
            .limit(8),
        ])

        if (isStale()) return

        const combined: SearchResult[] = [
          ...(portfolioData ?? []).map(e => ({ ...e, type: 'portfolio' as const })),
          ...(caseData ?? []).map(c => ({ ...c, type: 'case' as const })),
        ]
          .filter(e => !existingEntryIds.includes(e.id))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 8)

        setResults(combined)
      } finally {
        if (!isStale()) setSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const noBands = domain.bands.length === 0
  const canLink = !!selectedResult && (noBands || !!selectedBand)

  async function handleLink() {
    if (!selectedResult || !canLink) return
    setLinking(true)
    setError(null)
    try {
      let bandLabel: string
      let bandPoints: number
      if (noBands) {
        bandLabel = 'Evidence linked'
        bandPoints = 0
      } else {
        const band = domain.bands.find(b => b.label === selectedBand)
        if (!band) throw new Error('Band not found')
        bandLabel = band.label
        bandPoints = band.points
      }

      const { data, error: insertError } = await supabase
        .from('specialty_entry_links')
        .insert({
          application_id: applicationId,
          domain_key: domain.key,
          entry_id: selectedResult.id,
          entry_type: selectedResult.type,
          band_label: bandLabel,
          points_claimed: bandPoints,
          is_checkbox: false,
        })
        .select()
        .single()

      if (insertError) throw insertError
      if (!data) throw new Error('No data returned')

      onLinked(data as SpecialtyEntryLink)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link evidence')
    } finally {
      setLinking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--bg-surface)] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08] shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Link existing evidence</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{domain.label}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {!selectedResult ? (
            <>
              {/* Search */}
              <div className="relative mb-3">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search portfolio entries and cases..."
                  className="w-full bg-[var(--bg-canvas)] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
                {searching && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-[var(--accent)] border-t-transparent rounded-full motion-safe:animate-spin" />
                )}
              </div>

              {results.length > 0 && (
                <div className="space-y-1.5">
                  {results.map(result => (
                    <button
                      key={result.id}
                      onClick={() => setSelectedResult(result)}
                      className="w-full flex items-start gap-3 p-3 bg-[var(--bg-canvas)] border border-white/[0.06] hover:border-white/[0.16] rounded-xl text-left transition-all"
                    >
                      <span className="text-xs mt-0.5 shrink-0 text-[var(--text-muted)]">{result.type === 'case' ? 'Case' : 'Entry'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-primary)] font-medium truncate">{result.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-[var(--text-secondary)]">
                            {new Date(result.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[var(--text-secondary)] text-xs capitalize">
                            {result.type}
                          </span>
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-1">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}

              {query && !searching && results.length === 0 && (
                <p className="text-center text-xs text-[var(--text-secondary)] py-6">
                  No matching entries or cases found.
                </p>
              )}

              {!query && (
                <p className="text-center text-xs text-[var(--text-secondary)] py-6">
                  Start typing to search your portfolio entries and cases.
                </p>
              )}
            </>
          ) : (
            <>
              {/* Selected entry + band selection */}
              <div className="flex items-center gap-2 mb-5">
                <button
                  onClick={() => setSelectedResult(null)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  ← Back
                </button>
                <span className="text-[var(--text-secondary)]">|</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs shrink-0 text-[var(--text-muted)]">{selectedResult.type === 'case' ? 'Case' : 'Entry'}</span>
                  <span className="text-sm text-[var(--text-primary)] font-medium truncate">{selectedResult.title}</span>
                </div>
              </div>

              {noBands ? (
                <div className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    This domain is evidence-only - no scoring bands. Linking this evidence will
                    mark the domain as evidenced.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-xs text-[var(--text-emphasis)] font-medium uppercase tracking-wide mb-2 block">
                    Which scoring band does this evidence qualify for?
                  </label>
                  <select
                    value={selectedBand}
                    onChange={e => setSelectedBand(e.target.value)}
                    className="w-full bg-[var(--bg-canvas)] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none"
                  >
                    <option value="">Select a band…</option>
                    {domain.bands.map(band => (
                      <option key={band.label} value={band.label}>
                        {band.label} ({band.points} pts)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {selectedResult && (
          <div className="p-6 border-t border-white/[0.08] shrink-0">
            <button
              onClick={handleLink}
              disabled={!canLink || linking}
              className="w-full py-2.5 bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-40 text-[var(--button-primary-text)] font-semibold text-sm rounded-xl transition-colors"
            >
              {linking ? 'Linking…' : 'Link evidence'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
