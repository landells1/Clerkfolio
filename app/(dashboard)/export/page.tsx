'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, CATEGORY_COLOURS, type Category } from '@/lib/types/portfolio'
import type { PortfolioEntry } from '@/lib/types/portfolio'
import { getSubscriptionInfo, type SubscriptionInfo } from '@/lib/subscription'
import { getSpecialtyConfig } from '@/lib/specialties'

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

type TagCount = { tag: string; count: number }
type TrackedApp = { id: string; specialty_key: string }

export default function ExportPage() {
  const supabase = createClient()

  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null)
  const [portfolioTags, setPortfolioTags] = useState<TagCount[]>([])
  const [trackedApps, setTrackedApps] = useState<TrackedApp[]>([])
  const [specialty, setSpecialty] = useState<string>('')
  const [format, setFormat] = useState<'pdf' | 'csv' | 'json'>('pdf')
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all')
  const [entries, setEntries] = useState<PortfolioEntry[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedSpecialty, setLoadedSpecialty] = useState<string | null>(null)

  // Load user data on mount
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [
        { data: profile },
        { data: tagRows },
        { data: apps },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('trial_started_at, subscription_status, subscription_period_end')
          .eq('id', user.id)
          .single(),
        supabase
          .from('portfolio_entries')
          .select('specialty_tags')
          .eq('user_id', user.id)
          .is('deleted_at', null),
        supabase
          .from('specialty_applications')
          .select('id, specialty_key')
          .eq('user_id', user.id),
      ])

      if (profile) {
        setSubInfo(getSubscriptionInfo({
          trial_started_at: profile.trial_started_at,
          subscription_status: profile.subscription_status,
          subscription_period_end: profile.subscription_period_end,
        }))
      }

      // Count entries per tag, sorted by count desc
      const tagCounts: Record<string, number> = {}
      tagRows?.forEach(row => {
        row.specialty_tags?.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
        })
      })
      const sorted = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) => ({ tag, count }))

      setPortfolioTags(sorted)
      setTrackedApps(apps ?? [])

      // Default to highest-count tag, or first tracked specialty
      if (sorted.length > 0) {
        setSpecialty(sorted[0].tag)
      } else if ((apps ?? []).length > 0) {
        setSpecialty(apps![0].specialty_key)
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

    let cancelled = false

    async function loadEntries() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const { data } = await supabase
        .from('portfolio_entries')
        .select('*')
        .eq('user_id', user.id)
        .contains('specialty_tags', [specialty])
        .is('deleted_at', null)
        .order('date', { ascending: false })

      if (cancelled) return

      setEntries(data ?? [])
      setSelectedIds(new Set((data ?? []).map((e: PortfolioEntry) => e.id)))
      setLoadedSpecialty(specialty)
      setLoading(false)
    }
    loadEntries()

    return () => { cancelled = true }
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
        body: JSON.stringify({ entryIds: Array.from(selectedIds), specialty, format }),
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
      const safeSpecialty = specialty.toLowerCase().replace(/\s+/g, '-')
      const dateStr = new Date().toISOString().split('T')[0]
      a.download = `clinidex-${safeSpecialty}-${dateStr}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // Tracked specialty names not already in portfolio tags (no entries yet)
  const portfolioTagSet = new Set(portfolioTags.map(t => t.tag.toLowerCase()))
  const trackedNotInPortfolio = trackedApps.filter(app => {
    const cfg = getSpecialtyConfig(app.specialty_key)
    const name = cfg?.name ?? app.specialty_key
    return !portfolioTagSet.has(name.toLowerCase())
  })

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/portfolio" className="inline-flex items-center gap-1.5 text-sm text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Portfolio
        </Link>
      </div>

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
          className="flex items-center gap-2 bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-40 text-[#0B0B0C] font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors shrink-0"
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
              Export {format.toUpperCase()} {totalSelected > 0 && `(${totalSelected})`}
            </>
          )}
        </button>
      </div>

      {/* Pro gate */}
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
            className="inline-flex items-center gap-2 bg-[#1B6FD9] hover:bg-[#155BB0] text-[#0B0B0C] font-semibold rounded-xl px-6 py-2.5 text-sm transition-colors"
          >
            Upgrade to Pro — £10/year
          </a>
        </div>
      )}

      {/* Step 1 — Specialty */}
      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider mb-0.5">Target specialty</p>
            <p className="text-xs text-[rgba(245,245,242,0.35)]">Specialties with tagged entries in your portfolio</p>
          </div>
        </div>

        {/* Portfolio tag chips — sorted by entry count */}
        {portfolioTags.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-3">
            {portfolioTags.map(({ tag, count }) => {
              const tagLabel = getSpecialtyConfig(tag)?.name ?? tag
              return (
              <button
                key={tag}
                onClick={() => setSpecialty(tag)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  specialty === tag
                    ? 'bg-[#1B6FD9]/20 text-[#1B6FD9] border border-[#1B6FD9]/40'
                    : 'bg-white/[0.04] text-[rgba(245,245,242,0.55)] border border-white/[0.06] hover:text-[#F5F5F2] hover:border-white/[0.12]'
                }`}
              >
                {tagLabel}
                <span className={`text-[10px] font-semibold px-1 py-0.5 rounded ${
                  specialty === tag ? 'bg-[#1B6FD9]/30 text-[#1B6FD9]' : 'bg-white/[0.07] text-[rgba(245,245,242,0.4)]'
                }`}>
                  {count}
                </span>
              </button>
            )})}
          </div>
        ) : (
          <p className="text-xs text-[rgba(245,245,242,0.3)] mb-3">
            No specialty tags found. Tag your portfolio entries with a specialty to see them here.
          </p>
        )}

        {/* Free text input */}
        <input
          type="text"
          value={specialty}
          onChange={e => setSpecialty(e.target.value)}
          placeholder="Or type any specialty…"
          className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1B6FD9] transition-colors"
        />
      </div>

      {/* Specialty tracker panel */}
      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider mb-0.5">Specialty tracker</p>
            <p className="text-xs text-[rgba(245,245,242,0.35)]">Specialties you&apos;re actively scoring — tag your entries to see them above</p>
          </div>
          <Link
            href="/specialties"
            className="flex items-center gap-1.5 text-xs text-[#1B6FD9] hover:text-[#3884DD] transition-colors font-medium shrink-0"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add specialty
          </Link>
        </div>

        {trackedApps.length === 0 ? (
          <div className="flex items-center gap-3 py-2">
            <p className="text-xs text-[rgba(245,245,242,0.3)]">No specialties tracked yet.</p>
            <Link href="/specialties" className="text-xs text-[#1B6FD9] hover:text-[#3884DD] transition-colors">
              Start tracking →
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {trackedApps.map(app => {
              const cfg = getSpecialtyConfig(app.specialty_key)
              const name = cfg?.name ?? app.specialty_key
              // Use the raw key for filtering (matches specialty_tags in DB)
              // but display the formatted name to the user
              const hasEntries = portfolioTagSet.has(app.specialty_key.toLowerCase()) || portfolioTagSet.has(name.toLowerCase())
              return (
                <button
                  key={app.id}
                  onClick={() => setSpecialty(app.specialty_key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    specialty === app.specialty_key
                      ? 'bg-[#1B6FD9]/20 text-[#1B6FD9] border-[#1B6FD9]/40'
                      : 'bg-white/[0.04] text-[rgba(245,245,242,0.55)] border-white/[0.06] hover:text-[#F5F5F2] hover:border-white/[0.12]'
                  }`}
                >
                  {name}
                  {hasEntries ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1B6FD9]/70 flex-shrink-0" />
                  ) : (
                    <span className="text-[10px] text-[rgba(245,245,242,0.25)] font-normal">no entries</span>
                  )}
                </button>
              )
            })}
            {trackedNotInPortfolio.length > 0 && (
              <p className="w-full text-[11px] text-[rgba(245,245,242,0.25)] mt-1">
                Specialties marked &quot;no entries&quot; have no tagged portfolio items yet.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Format selector */}
      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5 mb-4">
        <p className="text-xs font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider mb-3">Export format</p>
        <div className="flex gap-2">
          {(['pdf', 'csv', 'json'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                format === f
                  ? 'bg-[#1B6FD9]/15 border-[#1B6FD9]/40 text-[#1B6FD9]'
                  : 'bg-white/[0.04] text-[rgba(245,245,242,0.55)] border border-white/[0.06] hover:text-[#F5F5F2] hover:border-white/[0.12]'
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter */}
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

      {/* Entry list */}
      {loadedSpecialty && (
        <div className="bg-[#141416] border border-white/[0.08] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
            <p className="text-xs font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider">
              {loading ? 'Loading…' : `${visible.length} ${visible.length === 1 ? 'entry' : 'entries'} · ${visibleSelected} selected`}
            </p>
            {!loading && visible.length > 0 && (
              <div className="flex items-center gap-3">
                <button onClick={selectAll} className="text-xs text-[#1B6FD9] hover:text-[#3884DD] transition-colors">Select all</button>
                <button onClick={deselectAll} className="text-xs text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors">Deselect all</button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-[#1B6FD9] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <div className="py-12 text-center px-6">
              <p className="text-sm text-[rgba(245,245,242,0.35)] mb-3">
                No entries tagged to &quot;{loadedSpecialty}&quot;{categoryFilter !== 'all' ? ' in this category' : ''}.
              </p>
              <p className="text-xs text-[rgba(245,245,242,0.25)]">
                Tag your portfolio or case entries with this specialty to include them here.
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
                      checked ? 'bg-[#1B6FD9]/5' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div
                      className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        checked ? 'bg-[#1B6FD9] border-[#1B6FD9]' : 'border-white/[0.2] bg-transparent'
                      }`}
                    >
                      {checked && (
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0B0B0C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <input type="checkbox" className="hidden" checked={checked} onChange={() => toggleEntry(e.id)} />
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
    </div>
  )
}
