'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SpecialtyDomain, SpecialtyEntryLink } from '@/lib/specialties'

type SearchResult = {
  id: string
  title: string
  date: string
  type: 'portfolio'
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

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const { data: portfolioData } = await supabase
          .from('portfolio_entries')
          .select('id, title, date')
          .ilike('title', `%${query}%`)
          .is('deleted_at', null)
          .limit(8)

        const combined: SearchResult[] = [
          ...(portfolioData ?? []).map(e => ({ ...e, type: 'portfolio' as const })),
        ]
          .filter(e => !existingEntryIds.includes(e.id))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        setResults(combined)
      } finally {
        setSearching(false)
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
      <div className="bg-[#141416] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08] shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[#F5F5F2]">Link existing evidence</h2>
            <p className="text-xs text-[rgba(245,245,242,0.4)] mt-0.5">{domain.label}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] hover:bg-white/[0.06] transition-all"
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
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search portfolio entries..."
                  className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1B6FD9] transition-colors"
                />
                {searching && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-[#1B6FD9] border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              {results.length > 0 && (
                <div className="space-y-1.5">
                  {results.map(result => (
                    <button
                      key={result.id}
                      onClick={() => setSelectedResult(result)}
                      className="w-full flex items-start gap-3 p-3 bg-[#0B0B0C] border border-white/[0.06] hover:border-white/[0.16] rounded-xl text-left transition-all"
                    >
                      <span className="text-xs mt-0.5 shrink-0 text-[rgba(245,245,242,0.45)]">Entry</span>
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
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-1">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}

              {query && !searching && results.length === 0 && (
                <p className="text-center text-xs text-[rgba(245,245,242,0.3)] py-6">
                  No matching entries found.
                </p>
              )}

              {!query && (
                <p className="text-center text-xs text-[rgba(245,245,242,0.3)] py-6">
                  Start typing to search your portfolio entries.
                </p>
              )}
            </>
          ) : (
            <>
              {/* Selected entry + band selection */}
              <div className="flex items-center gap-2 mb-5">
                <button
                  onClick={() => setSelectedResult(null)}
                  className="text-xs text-[rgba(245,245,242,0.45)] hover:text-[#F5F5F2] transition-colors"
                >
                  ← Back
                </button>
                <span className="text-[rgba(245,245,242,0.2)]">|</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs shrink-0 text-[rgba(245,245,242,0.45)]">Entry</span>
                  <span className="text-sm text-[#F5F5F2] font-medium truncate">{selectedResult.title}</span>
                </div>
              </div>

              {noBands ? (
                <div className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                  <p className="text-xs text-[rgba(245,245,242,0.55)] leading-relaxed">
                    This domain is evidence-only — no scoring bands. Linking this entry will
                    mark the domain as evidenced.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-xs text-[rgba(245,245,242,0.4)] font-medium uppercase tracking-wide mb-2 block">
                    Which scoring band does this evidence qualify for?
                  </label>
                  <select
                    value={selectedBand}
                    onChange={e => setSelectedBand(e.target.value)}
                    className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9] transition-colors appearance-none"
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
              className="w-full py-2.5 bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-40 text-[#0B0B0C] font-semibold text-sm rounded-xl transition-colors"
            >
              {linking ? 'Linking…' : 'Link evidence'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
