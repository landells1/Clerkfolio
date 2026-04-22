'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, CATEGORY_COLOURS, type Category } from '@/lib/types/portfolio'
import type { PortfolioEntry } from '@/lib/types/portfolio'
import { getSubscriptionInfo, type SubscriptionInfo } from '@/lib/subscription'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function entrySubtitle(e: PortfolioEntry): string | null {
  switch (e.category) {
    case 'audit_qip':   return [e.audit_type?.toUpperCase(), e.audit_trust].filter(Boolean).join(' · ') || null
    case 'teaching':    return e.teaching_type?.replace('_', ' ') ?? null
    case 'conference':  return e.conf_event_name ?? null
    case 'publication': return [e.pub_type?.replace('_', ' '), e.pub_status].filter(Boolean).join(' · ') || null
    case 'leadership':  return [e.leader_role, e.leader_organisation].filter(Boolean).join(' · ') || null
    case 'prize':       return e.prize_body ?? null
    case 'procedure':   return e.proc_name ?? null
    case 'reflection':  return e.refl_type?.replace('_', '-').toUpperCase() ?? null
    default:            return null
  }
}

export default function ExportPage() {
  const supabase = createClient()

  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null)
  const [specialtyInterests, setSpecialtyInterests] = useState<string[]>([])
  const [specialty, setSpecialty] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all')
  const [entries, setEntries] = useState<PortfolioEntry[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedSpecialty, setLoadedSpecialty] = useState<string | null>(null)

  // Load user profile on mount
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('specialty_interests, trial_started_at, subscription_status, subscription_period_end')
        .eq('id', user.id)
        .single()
      const interests: string[] = data?.specialty_interests ?? []
      setSpecialtyInterests(interests)
      if (interests.length > 0) setSpecialty(interests[0])
      if (data) {
        setSubInfo(getSubscriptionInfo({
          trial_started_at: data.trial_started_at,
          subscription_status: data.subscription_status,
          subscription_period_end: data.subscription_period_end,
        }))
      }
    }
    load()
  }, [supabase])

  // Fetch entries whenever specialty changes
  useEffect(() => {
    if (!specialty) return
    setLoading(true)
    setEntries([])
    setSelectedIds(new Set())
    setLoadedSpecialty(null)

    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('portfolio_entries')
        .select('*')
        .eq('user_id', user.id)
        .contains('specialty_tags', [specialty])
        .order('date', { ascending: false })

      setEntries(data ?? [])
      setSelectedIds(new Set((data ?? []).map((e: PortfolioEntry) => e.id)))
      setLoadedSpecialty(specialty)
      setLoading(false)
    }
    fetch()
  }, [specialty, supabase])

  const visible = categoryFilter === 'all'
    ? entries
    : entries.filter(e => e.category === categoryFilter)

  const categoriesPresent = Array.from(new Set(entries.map(e => e.category))) as Category[]

  function toggleEntry(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() { setSelectedIds(new Set(visible.map(e => e.id))) }
  function deselectAll() { setSelectedIds(new Set()) }

  const visibleSelected = visible.filter(e => selectedIds.has(e.id)).length
  const totalSelected = selectedIds.size

  async function handleGenerate() {
    if (totalSelected === 0) return
    setGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds: Array.from(selectedIds), specialty }),
      })

      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? 'Export failed. Please try again.')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clinidex-${specialty.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Export</h1>
          <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">
            Select entries and generate a clean PDF for any specialty application.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={totalSelected === 0 || generating || (subInfo != null && !subInfo.canExport)}
          className="flex items-center gap-2 bg-[#1D9E75] hover:bg-[#178060] disabled:opacity-40 text-[#0B0B0C] font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors shrink-0"
        >
          {generating ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-[#0B0B0C]/40 border-t-[#0B0B0C] rounded-full animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export PDF {totalSelected > 0 && `(${totalSelected})`}
            </>
          )}
        </button>
      </div>

      {/* Pro gate — show if subscription loaded and not allowed to export */}
      {subInfo && !subInfo.canExport && (
        <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-8 mb-6 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 mb-4">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-amber-400 text-xs font-semibold">Pro feature</span>
          </div>
          <h2 className="text-base font-semibold text-[#F5F5F2] mb-2">Your free trial has ended</h2>
          <p className="text-sm text-[rgba(245,245,242,0.45)] mb-6 max-w-sm mx-auto">
            PDF export requires a Pro subscription. Upgrade to keep generating CVs and application portfolios.
          </p>
          <a
            href="/settings"
            className="inline-flex items-center gap-2 bg-[#1D9E75] hover:bg-[#178060] text-[#0B0B0C] font-semibold rounded-xl px-6 py-2.5 text-sm transition-colors"
          >
            Upgrade to Pro — £10/year
          </a>
        </div>
      )}

      {/* Step 1 — Specialty */}
      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5 mb-4">
        <p className="text-xs font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider mb-3">Specialty</p>
        {specialtyInterests.length === 0 ? (
          <p className="text-sm text-[rgba(245,245,242,0.4)]">
            No specialty interests set.{' '}
            <a href="/specialties" className="text-[#1D9E75] hover:underline">Add some →</a>
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {specialtyInterests.map(s => (
              <button
                key={s}
                onClick={() => setSpecialty(s)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  specialty === s
                    ? 'bg-[#1D9E75]/20 text-[#1D9E75] border border-[#1D9E75]/40'
                    : 'bg-white/[0.04] text-[rgba(245,245,242,0.55)] border border-white/[0.06] hover:text-[#F5F5F2] hover:border-white/[0.12]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Step 2 — Category filter */}
      {loadedSpecialty && (
        <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5 mb-4">
          <p className="text-xs font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider mb-3">
            Filter by category
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-[#F5F5F2]/10 text-[#F5F5F2] border border-white/[0.15]'
                  : 'bg-white/[0.04] text-[rgba(245,245,242,0.5)] border border-white/[0.06] hover:text-[#F5F5F2]'
              }`}
            >
              All <span className="text-[rgba(245,245,242,0.35)] text-xs ml-1">{entries.length}</span>
            </button>
            {CATEGORIES.filter(c => categoriesPresent.includes(c.value)).map(cat => {
              const count = entries.filter(e => e.category === cat.value).length
              return (
                <button
                  key={cat.value}
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    categoryFilter === cat.value
                      ? 'bg-[#F5F5F2]/10 text-[#F5F5F2] border border-white/[0.15]'
                      : 'bg-white/[0.04] text-[rgba(245,245,242,0.5)] border border-white/[0.06] hover:text-[#F5F5F2]'
                  }`}
                >
                  {cat.short} <span className="text-[rgba(245,245,242,0.35)] text-xs ml-1">{count}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 3 — Entry list */}
      {loadedSpecialty && (
        <div className="bg-[#141416] border border-white/[0.08] rounded-2xl overflow-hidden">
          {/* List header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
            <p className="text-xs font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider">
              {loading ? 'Loading…' : `${visible.length} ${visible.length === 1 ? 'entry' : 'entries'} · ${visibleSelected} selected`}
            </p>
            {!loading && visible.length > 0 && (
              <div className="flex items-center gap-3">
                <button onClick={selectAll} className="text-xs text-[#1D9E75] hover:text-[#22c693] transition-colors">Select all</button>
                <button onClick={deselectAll} className="text-xs text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors">Deselect all</button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-[rgba(245,245,242,0.35)]">
                No entries tagged to {loadedSpecialty}{categoryFilter !== 'all' ? ` in this category` : ''}.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {visible.map(e => {
                const checked = selectedIds.has(e.id)
                const colour = CATEGORY_COLOURS[e.category]
                const catLabel = CATEGORIES.find(c => c.value === e.category)?.short ?? e.category
                const sub = entrySubtitle(e)
                return (
                  <label
                    key={e.id}
                    className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors ${
                      checked ? 'bg-[#1D9E75]/5' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        checked ? 'bg-[#1D9E75] border-[#1D9E75]' : 'border-white/[0.2] bg-transparent'
                      }`}
                    >
                      {checked && (
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0B0B0C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <input type="checkbox" className="hidden" checked={checked} onChange={() => toggleEntry(e.id)} />

                    {/* Entry info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${colour.bg} ${colour.text}`}>{catLabel}</span>
                        <span className="text-sm text-[rgba(245,245,242,0.9)] truncate">{e.title}</span>
                      </div>
                      {sub && <p className="text-xs text-[rgba(245,245,242,0.4)] truncate capitalize">{sub}</p>}
                    </div>

                    <span className="shrink-0 text-xs text-[rgba(245,245,242,0.3)] font-mono">{formatDate(e.date)}</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Placeholder if no specialty set */}
      {specialtyInterests.length === 0 && !loadedSpecialty && (
        <div className="flex items-center justify-center h-48 border border-dashed border-white/[0.08] rounded-2xl">
          <div className="text-center">
            <p className="text-sm text-[rgba(245,245,242,0.35)] mb-2">Set specialty interests to begin</p>
            <a href="/specialties" className="text-sm text-[#1D9E75] hover:underline">Go to Specialties →</a>
          </div>
        </div>
      )}
    </div>
  )
}
