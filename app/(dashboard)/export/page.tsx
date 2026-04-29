'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, CATEGORY_COLOURS, type Category, type PortfolioEntry } from '@/lib/types/portfolio'
import { fetchSubscriptionInfo, type SubscriptionInfo } from '@/lib/subscription'
import { getSpecialtyConfig } from '@/lib/specialties'

type Tab = 'pdf' | 'backup' | 'share'
type ExportFormat = 'pdf' | 'csv' | 'json'
type ShareScope = 'specialty' | 'theme' | 'full'

const EXPIRY_PRESETS = [
  { label: '1 day', days: 1 },
  { label: '1 week', days: 7 },
  { label: '1 month', days: 30 },
  { label: 'Custom', days: null },
]

type ShareLink = {
  id: string
  token: string
  scope: ShareScope
  specialty_key: string | null
  theme_slug: string | null
  expires_at: string
  view_count: number
  created_at: string
}
type TrackedApp = { id: string; specialty_key: string }
type TagCount = { tag: string; count: number }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isoDateOffset(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

function entrySubtitle(e: PortfolioEntry): string | null {
  switch (e.category) {
    case 'audit_qip': return [e.audit_type?.toUpperCase(), e.audit_trust].filter(Boolean).join(' - ') || null
    case 'teaching': return e.teaching_type?.replace('_', ' ') ?? null
    case 'conference': return e.conf_event_name ?? null
    case 'publication': return [e.pub_type?.replace('_', ' '), e.pub_status].filter(Boolean).join(' - ') || null
    case 'leadership': return [e.leader_role, e.leader_organisation].filter(Boolean).join(' - ') || null
    case 'prize': return e.prize_body ?? null
    case 'procedure': return e.proc_name ?? null
    case 'reflection': return e.refl_type?.replace('_', '-').toUpperCase() ?? null
    default: return null
  }
}

function shareLabel(link: ShareLink) {
  if (link.scope === 'full') return 'Full portfolio'
  if (link.scope === 'theme') return `Theme: ${link.theme_slug ?? 'unknown'}`
  return getSpecialtyConfig(link.specialty_key ?? '')?.name ?? link.specialty_key ?? 'Specialty'
}

export default function ExportPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('pdf')
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null)
  const [portfolioTags, setPortfolioTags] = useState<TagCount[]>([])
  const [trackedApps, setTrackedApps] = useState<TrackedApp[]>([])
  const [specialty, setSpecialty] = useState('')
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all')
  const [entries, setEntries] = useState<PortfolioEntry[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loadedSpecialty, setLoadedSpecialty] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [backupLoading, setBackupLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [shareScope, setShareScope] = useState<ShareScope>('specialty')
  const [shareTheme, setShareTheme] = useState('')
  const [sharePin, setSharePin] = useState('')
  const [expiryPreset, setExpiryPreset] = useState<number | null>(30)
  const [customExpiry, setCustomExpiry] = useState('')
  const [shareLoading, setShareLoading] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [subInfo, { data: tagRows }, { data: apps }, { data: links }] = await Promise.all([
        fetchSubscriptionInfo(supabase, user.id),
        supabase.from('portfolio_entries').select('specialty_tags').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('specialty_applications').select('id, specialty_key').eq('user_id', user.id).eq('is_active', true),
        fetch('/api/share').then(r => r.ok ? r.json() : []),
      ])

      setSubInfo(subInfo)

      const counts: Record<string, number> = {}
      tagRows?.forEach(row => row.specialty_tags?.forEach((tag: string) => { counts[tag] = (counts[tag] ?? 0) + 1 }))
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }))
      setPortfolioTags(sorted)
      setTrackedApps(apps ?? [])
      setShareLinks((links ?? []) as ShareLink[])
      setSpecialty(sorted[0]?.tag ?? apps?.[0]?.specialty_key ?? '')
    }
    load()
  }, [supabase])

  useEffect(() => {
    if (!specialty) return
    let cancelled = false
    async function loadEntries() {
      setLoading(true)
      setEntries([])
      setSelectedIds(new Set())
      setLoadedSpecialty(null)

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
      const rows = (data ?? []) as PortfolioEntry[]
      setEntries(rows)
      setSelectedIds(new Set(rows.map(e => e.id)))
      setLoadedSpecialty(specialty)
      setLoading(false)
    }
    loadEntries()
    return () => { cancelled = true }
  }, [specialty, supabase])

  const visible = categoryFilter === 'all' ? entries : entries.filter(e => e.category === categoryFilter)
  const categoriesPresent = Array.from(new Set(entries.map(e => e.category))) as Category[]
  const totalSelected = selectedIds.size
  const themes = useMemo(() => {
    const set = new Set<string>()
    entries.forEach(e => e.interview_themes?.forEach(t => set.add(t)))
    return Array.from(set).sort()
  }, [entries])

  async function downloadBlob(res: Response, fallbackName: string) {
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fallbackName
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleGenerate() {
    if (totalSelected === 0) return
    setGenerating(true)
    setError(null)
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryIds: Array.from(selectedIds), specialty, format }),
    })
    setGenerating(false)
    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Export failed. Please try again.')
      return
    }
    const dateStr = new Date().toISOString().split('T')[0]
    await downloadBlob(res, `clerkfolio-${specialty || 'portfolio'}-${dateStr}.${format}`)
  }

  async function handleBackup() {
    setBackupLoading(true)
    setError(null)
    const res = await fetch('/api/account/export', { method: 'POST' })
    setBackupLoading(false)
    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Backup failed. Please try again.')
      return
    }
    const dateStr = new Date().toISOString().split('T')[0]
    await downloadBlob(res, `clerkfolio-export-${dateStr}.zip`)
  }

  async function createShareLink() {
    setShareLoading(true)
    setError(null)
    const expiresAt = expiryPreset
      ? new Date(Date.now() + expiryPreset * 86_400_000).toISOString()
      : customExpiry

    if (!expiresAt) {
      setShareLoading(false)
      setError('Choose an expiry date.')
      return
    }

    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: shareScope,
        specialty_key: shareScope === 'specialty' ? specialty : null,
        theme_slug: shareScope === 'theme' ? shareTheme : null,
        expires_at: expiresAt,
        pin: sharePin || null,
      }),
    })
    const json = await res.json()
    setShareLoading(false)
    if (!res.ok) {
      setError(json.error ?? 'Could not create share link.')
      return
    }
    setShareLinks(prev => [json as ShareLink, ...prev])
    setSharePin('')
  }

  async function revokeShareLink(id: string) {
    const res = await fetch(`/api/share?id=${id}`, { method: 'DELETE' })
    if (res.ok) setShareLinks(prev => prev.filter(link => link.id !== id))
  }

  async function renewShareLink(id: string) {
    const res = await fetch('/api/share', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, days: 30 }),
    })
    const json = await res.json()
    if (res.ok) setShareLinks(prev => prev.map(link => link.id === id ? { ...link, expires_at: json.expires_at } : link))
  }

  async function copyLink(token: string) {
    const url = `${window.location.origin}/share/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 1500)
  }

  return (
    <div className="max-w-5xl p-6 lg:p-8">
      <div className="mb-6">
        <Link href="/portfolio" className="text-sm text-[rgba(245,245,242,0.45)] transition-colors hover:text-[#F5F5F2]">Back to portfolio</Link>
      </div>

      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#F5F5F2]">Export & share</h1>
          <p className="mt-1 text-sm text-[rgba(245,245,242,0.45)]">Generate application packs, back up your data, and create protected portfolio links.</p>
        </div>
        {subInfo && !subInfo.isPro && (
          <Link href="/settings" className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-300">
            Free plan limits active
          </Link>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-white/[0.08] bg-[#141416] p-1.5">
        {(['pdf', 'backup', 'share'] as Tab[]).map(item => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${tab === item ? 'bg-[#1B6FD9] text-[#0B0B0C]' : 'text-[rgba(245,245,242,0.55)] hover:bg-white/[0.04] hover:text-[#F5F5F2]'}`}
          >
            {item === 'pdf' ? 'Application PDF' : item === 'backup' ? 'Data backup' : 'Share links'}
          </button>
        ))}
      </div>

      {tab !== 'backup' && (
        <div className="mb-4 rounded-2xl border border-white/[0.08] bg-[#141416] p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[rgba(245,245,242,0.35)]">Target specialty</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {portfolioTags.map(({ tag, count }) => (
              <button key={tag} onClick={() => setSpecialty(tag)} className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${specialty === tag ? 'border-[#1B6FD9]/40 bg-[#1B6FD9]/20 text-[#1B6FD9]' : 'border-white/[0.06] bg-white/[0.04] text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2]'}`}>
                {getSpecialtyConfig(tag)?.name ?? tag} <span className="ml-1 text-xs opacity-60">{count}</span>
              </button>
            ))}
            {trackedApps.filter(app => !portfolioTags.some(t => t.tag === app.specialty_key)).map(app => (
              <button key={app.id} onClick={() => setSpecialty(app.specialty_key)} className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${specialty === app.specialty_key ? 'border-[#1B6FD9]/40 bg-[#1B6FD9]/20 text-[#1B6FD9]' : 'border-white/[0.06] bg-white/[0.04] text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2]'}`}>
                {getSpecialtyConfig(app.specialty_key)?.name ?? app.specialty_key}
              </button>
            ))}
          </div>
          <input value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="Or type any specialty..." className="w-full rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3.5 py-2.5 text-sm text-[#F5F5F2] outline-none transition-colors focus:border-[#1B6FD9]" />
        </div>
      )}

      {tab === 'pdf' && (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#141416] p-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[rgba(245,245,242,0.35)]">Format</p>
              <div className="flex gap-2">
                {(['pdf', 'csv', 'json'] as ExportFormat[]).map(f => (
                  <button key={f} onClick={() => setFormat(f)} className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium ${format === f ? 'border-[#1B6FD9]/40 bg-[#1B6FD9]/15 text-[#1B6FD9]' : 'border-white/[0.06] bg-white/[0.04] text-[rgba(245,245,242,0.55)]'}`}>
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {loadedSpecialty && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#141416] p-5">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[rgba(245,245,242,0.35)]">Category</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setCategoryFilter('all')} className={`rounded-lg border px-3 py-1.5 text-sm ${categoryFilter === 'all' ? 'border-white/[0.15] bg-white/[0.1] text-[#F5F5F2]' : 'border-white/[0.06] bg-white/[0.04] text-[rgba(245,245,242,0.5)]'}`}>All</button>
                  {CATEGORIES.filter(c => categoriesPresent.includes(c.value)).map(cat => (
                    <button key={cat.value} onClick={() => setCategoryFilter(cat.value)} className={`rounded-lg border px-3 py-1.5 text-sm ${categoryFilter === cat.value ? 'border-white/[0.15] bg-white/[0.1] text-[#F5F5F2]' : 'border-white/[0.06] bg-white/[0.04] text-[rgba(245,245,242,0.5)]'}`}>{cat.short}</button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141416]">
            <div className="flex flex-col gap-3 border-b border-white/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-[rgba(245,245,242,0.35)]">
                {loading ? 'Loading...' : `${visible.length} entries - ${totalSelected} selected`}
              </p>
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedIds(new Set(visible.map(e => e.id)))} className="text-xs text-[#1B6FD9]">Select visible</button>
                <button onClick={() => setSelectedIds(new Set())} className="text-xs text-[rgba(245,245,242,0.45)]">Clear</button>
                <button onClick={handleGenerate} disabled={totalSelected === 0 || generating || (subInfo != null && !subInfo.limits.canExportPdf)} className="rounded-lg bg-[#1B6FD9] px-4 py-2 text-sm font-semibold text-[#0B0B0C] disabled:opacity-40">
                  {generating ? 'Generating...' : `Export ${format.toUpperCase()}`}
                </button>
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="p-8 text-sm text-[rgba(245,245,242,0.4)]">No entries match this specialty and category.</div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {visible.map(entry => {
                  const checked = selectedIds.has(entry.id)
                  const colour = CATEGORY_COLOURS[entry.category]
                  const label = CATEGORIES.find(c => c.value === entry.category)?.short ?? entry.category
                  return (
                    <label key={entry.id} className={`flex cursor-pointer items-center gap-4 px-5 py-3.5 transition-colors ${checked ? 'bg-[#1B6FD9]/5' : 'hover:bg-white/[0.02]'}`}>
                      <input type="checkbox" checked={checked} onChange={() => setSelectedIds(prev => {
                        const next = new Set(prev)
                        next.has(entry.id) ? next.delete(entry.id) : next.add(entry.id)
                        return next
                      })} className="h-4 w-4 accent-[#1B6FD9]" />
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex flex-wrap items-center gap-2">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${colour.bg} ${colour.text}`}>{label}</span>
                          <span className="truncate text-sm text-[rgba(245,245,242,0.9)]">{entry.title}</span>
                        </div>
                        {entrySubtitle(entry) && <p className="truncate text-xs capitalize text-[rgba(245,245,242,0.4)]">{entrySubtitle(entry)}</p>}
                      </div>
                      <span className="shrink-0 text-xs text-[rgba(245,245,242,0.3)]">{formatDate(entry.date)}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'backup' && (
        <section className="rounded-2xl border border-white/[0.08] bg-[#141416] p-6">
          <h2 className="text-lg font-semibold text-[#F5F5F2]">Full data backup</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[rgba(245,245,242,0.48)]">
            Download a ZIP containing your profile, portfolio entries, cases, deadlines, goals, specialty scoring links, templates, and evidence files.
          </p>
          <button onClick={handleBackup} disabled={backupLoading} className="mt-6 rounded-xl bg-[#1B6FD9] px-5 py-2.5 text-sm font-semibold text-[#0B0B0C] disabled:opacity-50">
            {backupLoading ? 'Preparing backup...' : 'Download ZIP backup'}
          </button>
        </section>
      )}

      {tab === 'share' && (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <section className="rounded-2xl border border-white/[0.08] bg-[#141416] p-5">
            <h2 className="text-base font-semibold text-[#F5F5F2]">Create protected link</h2>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[rgba(245,245,242,0.4)]">Scope</span>
                <select value={shareScope} onChange={e => setShareScope(e.target.value as ShareScope)} className="w-full rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3 py-2.5 text-sm text-[#F5F5F2]">
                  <option value="specialty">Current specialty</option>
                  <option value="theme">Competency theme</option>
                  <option value="full">Full portfolio</option>
                </select>
              </label>
              {shareScope === 'theme' && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[rgba(245,245,242,0.4)]">Theme</span>
                  <input value={shareTheme} onChange={e => setShareTheme(e.target.value)} list="themes" className="w-full rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3 py-2.5 text-sm text-[#F5F5F2]" />
                  <datalist id="themes">{themes.map(theme => <option key={theme} value={theme} />)}</datalist>
                </label>
              )}
              <div>
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[rgba(245,245,242,0.4)]">Expires</span>
                <div className="grid grid-cols-2 gap-2">
                  {EXPIRY_PRESETS.map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setExpiryPreset(preset.days)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        expiryPreset === preset.days
                          ? 'border-[#1B6FD9]/40 bg-[#1B6FD9]/15 text-[#1B6FD9]'
                          : 'border-white/[0.08] bg-[#0B0B0C] text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                {expiryPreset === null && (
                  <input
                    type="date"
                    value={customExpiry}
                    min={isoDateOffset(1)}
                    max={isoDateOffset(90)}
                    onChange={e => setCustomExpiry(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3 py-2.5 text-sm text-[#F5F5F2]"
                  />
                )}
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[rgba(245,245,242,0.4)]">PIN</span>
                <input value={sharePin} onChange={e => setSharePin(e.target.value)} inputMode="numeric" placeholder="Optional PIN (4-8 digits)" className="w-full rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3 py-2.5 text-sm text-[#F5F5F2]" />
                <p className="mt-1 text-xs text-[rgba(245,245,242,0.35)]">Optional PIN (4-8 digits)</p>
              </label>
              <button onClick={createShareLink} disabled={shareLoading || (subInfo != null && !subInfo.limits.canCreateShareLink)} className="w-full rounded-xl bg-[#1B6FD9] px-4 py-2.5 text-sm font-semibold text-[#0B0B0C] disabled:opacity-40">
                {shareLoading ? 'Creating...' : 'Create link'}
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141416]">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="text-base font-semibold text-[#F5F5F2]">Active links</h2>
            </div>
            {shareLinks.length === 0 ? (
              <p className="p-6 text-sm text-[rgba(245,245,242,0.45)]">No active share links.</p>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {shareLinks.map(link => (
                  <article key={link.id} className="p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#F5F5F2]">{shareLabel(link)}</p>
                        <p className="mt-1 text-xs text-[rgba(245,245,242,0.4)]">Expires {formatDate(link.expires_at)} - {link.view_count ?? 0} views</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => copyLink(link.token)} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-[rgba(245,245,242,0.65)] hover:text-[#F5F5F2]">{copiedToken === link.token ? 'Copied' : 'Copy'}</button>
                        <button onClick={() => renewShareLink(link.id)} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-[rgba(245,245,242,0.65)] hover:text-[#F5F5F2]">Renew</button>
                        <button onClick={() => revokeShareLink(link.id)} className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-300">Revoke</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {error && <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
    </div>
  )
}
