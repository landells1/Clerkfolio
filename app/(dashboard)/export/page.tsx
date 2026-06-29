'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, CATEGORY_COLOURS, type Category, type PortfolioEntry } from '@/lib/types/portfolio'
import { entrySubtitle as buildEntrySubtitle, formatCompetencyTheme } from '@/lib/types/portfolio-labels'
import type { Case } from '@/lib/types/cases'
import { fetchSubscriptionInfo, type SubscriptionInfo } from '@/lib/subscription'
import { apiFetch, NETWORK_ERROR_MESSAGE } from '@/lib/api-fetch'
import { formatSpecialtyLabel } from '@/lib/specialties'
import SectionHeader from '@/components/ui/section-header'
import { useToast } from '@/components/ui/toast-provider'

type Tab = 'import' | 'pdf' | 'backup' | 'share'
type ExportFormat = 'pdf' | 'csv' | 'json'
type PdfTemplate = 'default' | 'foundation' | 'mrcp' | 'st_application'
type ShareScope = 'specialty' | 'theme' | 'full'

const EXPIRY_PRESETS = [
  { label: '1 day', days: 1 },
  { label: '1 week', days: 7 },
  { label: '1 month', days: 30 },
  { label: 'Custom', days: null },
]
const ALL_RECORDS = '__all_records__'
const UNTAGGED_RECORDS = '__untagged_records__'

const EXPORT_FIELDS = [
  { value: 'record_type', label: 'Type' },
  { value: 'id', label: 'ID' },
  { value: 'title', label: 'Title' },
  { value: 'category_or_area', label: 'Category / area' },
  { value: 'date', label: 'Date' },
  { value: 'specialty_tags', label: 'Specialty tags' },
  { value: 'notes', label: 'Notes' },
  { value: 'created_at', label: 'Created' },
]

type ShareLink = {
  id: string
  token: string
  scope: ShareScope
  specialty_key: string | null
  theme_slug: string | null
  expires_at: string
  view_count: number
  hide_notes?: boolean
  hide_reflection?: boolean
  redact_tags?: boolean
  view_webhook_url?: string | null
  created_at: string
}
type TrackedApp = { id: string; specialty_key: string }
type TagCount = { tag: string; count: number }
type EntrySpecialtyFields = { specialty_tags: string[] | null }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isoDateOffset(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

function entrySubtitle(e: PortfolioEntry): string | null {
  return buildEntrySubtitle(e) || null
}

function shareLabel(link: ShareLink) {
  if (link.scope === 'full') return 'Full portfolio (entries only)'
  if (link.scope === 'theme') return `Theme: ${link.theme_slug ? formatCompetencyTheme(link.theme_slug) : 'unknown'}`
  return formatSpecialtyLabel(link.specialty_key)
}

function exportScopeLabel(value: string) {
  if (value === ALL_RECORDS) return 'all records'
  if (value === UNTAGGED_RECORDS) return 'untagged records'
  return formatSpecialtyLabel(value)
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null
  // RFC 5987 filename* (percent-encoded) takes precedence when present.
  const star = header.match(/filename\*=(?:UTF-8'')?([^;]+)/i)
  if (star?.[1]) {
    try { return decodeURIComponent(star[1].trim().replace(/^["']|["']$/g, '')) } catch { /* fall through */ }
  }
  const plain = header.match(/filename="?([^";]+)"?/i)
  return plain?.[1]?.trim() || null
}

function specialtyChipClass(active: boolean) {
  return `rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
    active
      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]'
      : 'border-white/[0.06] bg-white/[0.04] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
  }`
}

export default function ExportPage() {
  const supabase = createClient()
  const { addToast } = useToast()
  const errorRef = useRef<HTMLDivElement | null>(null)
  const [tab, setTab] = useState<Tab>('pdf')
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null)
  const [portfolioTags, setPortfolioTags] = useState<TagCount[]>([])
  const [trackedApps, setTrackedApps] = useState<TrackedApp[]>([])
  const [specialty, setSpecialty] = useState('')
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [pdfTemplate, setPdfTemplate] = useState<PdfTemplate>('default')
  const [themeFilter, setThemeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all')
  const [entries, setEntries] = useState<PortfolioEntry[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set())
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set())
  const [loadedSpecialty, setLoadedSpecialty] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [backupLoading, setBackupLoading] = useState(false)
  const [yearReviewLoading, setYearReviewLoading] = useState(false)
  const [markdownLoading, setMarkdownLoading] = useState(false)
  const [includeEvidenceBackup, setIncludeEvidenceBackup] = useState(true)
  const [appendPdfFile, setAppendPdfFile] = useState<File | null>(null)
  const [appendingPdf, setAppendingPdf] = useState(false)
  const [selectedFields, setSelectedFields] = useState<string[]>(EXPORT_FIELDS.map(field => field.value))
  const [error, setError] = useState<string | null>(null)

  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [shareScope, setShareScope] = useState<ShareScope>('specialty')
  const [shareSpecialty, setShareSpecialty] = useState('')
  const [shareTheme, setShareTheme] = useState('')
  const [sharePin, setSharePin] = useState('')
  const [hideNotes, setHideNotes] = useState(true)
  const [hideReflection, setHideReflection] = useState(true)
  const [redactTags, setRedactTags] = useState(true)
  const [viewWebhookUrl, setViewWebhookUrl] = useState('')
  const [expiryPreset, setExpiryPreset] = useState<number | null>(30)
  const [customExpiry, setCustomExpiry] = useState('')
  const [shareLoading, setShareLoading] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)
  const [revokingLink, setRevokingLink] = useState<string | null>(null)
  const copyTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => { if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current) }
  }, [])

  useEffect(() => {
    if (!error) return
    errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [error])

  // Allow deep-linking to a specific tab, e.g. ?tab=share - the now-retired
  // /settings/shared-links redirects here so share management lives on one
  // surface (F-027). Read from the URL directly (no Suspense needed for a
  // client-only effect).
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tab')
    if (requested === 'import' || requested === 'pdf' || requested === 'backup' || requested === 'share') {
      setTab(requested)
    }
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [subInfo, { data: tagRows }, { data: apps }, links] = await Promise.all([
        fetchSubscriptionInfo(supabase, user.id),
        supabase.from('portfolio_entries').select('specialty_tags').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('specialty_applications').select('id, specialty_key').eq('user_id', user.id).eq('is_active', true),
        apiFetch<ShareLink[]>('/api/share').then(r => (r.ok && r.data) ? r.data : []),
      ])

      setSubInfo(subInfo)

      const counts: Record<string, number> = {}
      ;((tagRows ?? []) as EntrySpecialtyFields[]).forEach(row => {
        const tags = new Set(row.specialty_tags ?? [])
        tags.forEach(tag => { counts[tag] = (counts[tag] ?? 0) + 1 })
      })
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }))
      setPortfolioTags(sorted)
      const activeApps = (apps ?? []) as TrackedApp[]
      setTrackedApps(activeApps)
      setShareSpecialty(current =>
        activeApps.some(app => app.specialty_key === current)
          ? current
          : activeApps[0]?.specialty_key ?? ''
      )
      setShareLinks((links ?? []) as ShareLink[])
      setSpecialty(sorted[0]?.tag ?? apps?.[0]?.specialty_key ?? ALL_RECORDS)
    }
    load()
  }, [supabase])

  useEffect(() => {
    if (!specialty) return
    let cancelled = false
    async function loadEntries() {
      setLoading(true)
      setEntries([])
      setCases([])
      setSelectedEntryIds(new Set())
      setSelectedCaseIds(new Set())
      setLoadedSpecialty(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const caseQuery = supabase
        .from('cases')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('date', { ascending: false })
      const [{ data }, { data: caseRows }] = await Promise.all([
        supabase
          .from('portfolio_entries')
          .select('*')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('date', { ascending: false }),
        specialty === ALL_RECORDS || specialty === UNTAGGED_RECORDS
          ? caseQuery
          : caseQuery.contains('specialty_tags', [specialty]),
      ])

      if (cancelled) return
      const rows = ((data ?? []) as PortfolioEntry[]).filter(entry => {
        if (specialty === ALL_RECORDS) return true
        const tags = entry.specialty_tags ?? []
        if (specialty === UNTAGGED_RECORDS) return tags.length === 0
        return tags.includes(specialty)
      })
      const caseData = ((caseRows ?? []) as Case[]).filter(row => {
        if (specialty !== UNTAGGED_RECORDS) return true
        return (row.specialty_tags ?? []).length === 0
      })
      setEntries(rows)
      setCases(caseData)
      setSelectedEntryIds(new Set(rows.map(e => e.id)))
      setSelectedCaseIds(new Set(caseData.map(c => c.id)))
      setLoadedSpecialty(specialty)
      setLoading(false)
    }
    loadEntries()
    return () => { cancelled = true }
  }, [specialty, supabase])

  const visible = (categoryFilter === 'all' ? entries : entries.filter(e => e.category === categoryFilter))
    .filter(e => !themeFilter || (e.interview_themes ?? []).includes(themeFilter))
  const visibleCases = categoryFilter === 'all' ? cases : []
  const categoriesPresent = Array.from(new Set(entries.map(e => e.category))) as Category[]
  const exportCaseIds = format === 'pdf' || categoryFilter !== 'all' ? new Set<string>() : selectedCaseIds
  const totalSelected = selectedEntryIds.size + exportCaseIds.size
  const canGenerate = totalSelected > 0 && !generating && (format !== 'pdf' || !!subInfo?.limits.canExportPdf)
  const themes = useMemo(() => {
    const set = new Set<string>()
    entries.forEach(e => e.interview_themes?.forEach(t => set.add(t)))
    return Array.from(set).sort()
  }, [entries])
  // Target-specialty selector inputs (F-046): two clean groups, both with
  // counts. Tracked specialties come first (even when 0 entries are linked
  // yet); "Tagged in your entries" lists linked specialties that aren't tracked.
  const tagCountMap = useMemo(() => new Map(portfolioTags.map(t => [t.tag, t.count])), [portfolioTags])
  const trackedSpecialtyOptions = useMemo(
    () => trackedApps.map(app => ({ key: app.specialty_key, count: tagCountMap.get(app.specialty_key) ?? 0 })),
    [trackedApps, tagCountMap],
  )
  const linkedOnlyOptions = useMemo(
    () => portfolioTags.filter(t => !trackedApps.some(a => a.specialty_key === t.tag)),
    [portfolioTags, trackedApps],
  )
  const selectedIsRealSpecialty = specialty !== '' && specialty !== ALL_RECORDS && specialty !== UNTAGGED_RECORDS
  const hasActiveShareLinks = shareLinks.length > 0
  const canCreateShareLink = subInfo ? (subInfo.isPro || shareLinks.length < 1) : false

  // Prefer the clean filename the server already sets in Content-Disposition
  // (e.g. "clerkfolio-all-records-2026-06-21.csv"). `a.download` overrides
  // Content-Disposition for blob URLs, so without this the raw client `specialty`
  // state leaked sentinels/slugs into the saved file name (F-043).
  async function downloadBlob(res: Response, fallbackName: string) {
    const serverName = filenameFromContentDisposition(res.headers.get('content-disposition'))
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = serverName ?? fallbackName
    a.click()
    URL.revokeObjectURL(url)
  }

  async function refreshSubscriptionInfo() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setSubInfo(await fetchSubscriptionInfo(supabase, user.id))
  }

  async function handleGenerate() {
    if (totalSelected === 0) return
    if (format === 'pdf' && selectedEntryIds.size === 0) {
      setError('PDF exports currently require at least one portfolio entry. Use CSV or JSON to export cases.')
      return
    }
    setGenerating(true)
    setError(null)
    const exportEntryIds = (categoryFilter !== 'all' || themeFilter)
      ? Array.from(selectedEntryIds).filter(id => visible.some(entry => entry.id === id))
      : Array.from(selectedEntryIds)
    const { ok, status, response } = await apiFetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryIds: exportEntryIds, caseIds: Array.from(exportCaseIds), specialty: exportScopeLabel(specialty), format, template: pdfTemplate, theme: themeFilter || null, fields: selectedFields }),
      parse: 'none',
    })
    setGenerating(false)
    if (!ok || !response) {
      if (status === null) { setError(NETWORK_ERROR_MESSAGE); return }
      const json = await response?.json().catch(() => ({})) ?? {}
      setError(json.error === 'limit_reached' ? `You've used your ${json.limit} included PDF export. Upgrade to Pro for unlimited PDF downloads.` : json.error ?? 'Export failed. Please try again.')
      if (format === 'pdf' && json.error === 'limit_reached') await refreshSubscriptionInfo()
      return
    }
    const dateStr = new Date().toISOString().split('T')[0]
    // Clean fallback name (matches the server's safeSpecialty) for the rare case
    // the Content-Disposition header is unreadable — never the raw sentinel/slug.
    const safeScope = exportScopeLabel(specialty).replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'portfolio'
    await downloadBlob(response, `clerkfolio-${safeScope}-${dateStr}.${format}`)
    if (format === 'pdf') await refreshSubscriptionInfo()
  }

  async function handleBackup() {
    setBackupLoading(true)
    setError(null)
    const { ok, status, response } = await apiFetch('/api/account/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ includeEvidence: includeEvidenceBackup }),
      parse: 'none',
    })
    setBackupLoading(false)
    if (!ok || !response) {
      if (status === null) { setError(NETWORK_ERROR_MESSAGE); return }
      const json = await response?.json().catch(() => ({})) ?? {}
      setError(json.error ?? 'Backup failed. Please try again.')
      return
    }
    const dateStr = new Date().toISOString().split('T')[0]
    await downloadBlob(response, `clerkfolio-export-${dateStr}.zip`)
  }

  async function handleYearReview() {
    setYearReviewLoading(true)
    setError(null)
    const { ok, status, response } = await apiFetch('/api/export/year-review', { method: 'POST', parse: 'none' })
    setYearReviewLoading(false)
    if (!ok || !response) {
      if (status === null) { setError(NETWORK_ERROR_MESSAGE); return }
      const json = await response?.json().catch(() => ({})) ?? {}
      setError(json.error === 'limit_reached' ? `You've used your ${json.limit} included PDF export. Year in review, Application PDF and CV downloads share this allowance.` : json.error ?? 'Could not generate year in review PDF.')
      return
    }
    await downloadBlob(response, `clerkfolio-year-review-${new Date().toISOString().split('T')[0]}.pdf`)
    await refreshSubscriptionInfo()
  }

  async function handleAppendPdf() {
    if (!appendPdfFile || selectedEntryIds.size === 0) return
    setAppendingPdf(true)
    setError(null)
    const form = new FormData()
    form.set('pdf', appendPdfFile)
    form.set('entryIds', JSON.stringify(Array.from(selectedEntryIds)))
    const { ok, status, response } = await apiFetch('/api/export/pdf-append', { method: 'POST', body: form, parse: 'none' })
    setAppendingPdf(false)
    if (!ok || !response) {
      if (status === null) { setError(NETWORK_ERROR_MESSAGE); return }
      const json = await response?.json().catch(() => ({})) ?? {}
      setError(json.error === 'limit_reached' ? `You've used your ${json.limit} included PDF export. Appended PDFs, Year in review, Application PDF and CV downloads share this allowance.` : json.error ?? 'Could not append entries to PDF.')
      return
    }
    await downloadBlob(response, `clerkfolio-appended-${new Date().toISOString().split('T')[0]}.pdf`)
    await refreshSubscriptionInfo()
  }

  async function handleMarkdownExport() {
    setMarkdownLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/export/markdown')
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error ?? 'Could not export reflections. Please try again.')
        return
      }
      await downloadBlob(res, `clerkfolio-reflections-${new Date().toISOString().split('T')[0]}.md`)
    } catch {
      setError('Could not export reflections. Please try again.')
    } finally {
      setMarkdownLoading(false)
    }
  }

  async function downloadEvidenceZip(entryId: string, title: string) {
    const { ok, status, response } = await apiFetch(`/api/export/evidence?entry_id=${entryId}`, { parse: 'none' })
    if (!ok || !response) {
      if (status === null) { setError(NETWORK_ERROR_MESSAGE); return }
      const json = await response?.json().catch(() => ({})) ?? {}
      setError(json.error ?? 'No evidence files available for that entry.')
      return
    }
    await downloadBlob(response, `evidence-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || entryId}.zip`)
  }

  async function createShareLink() {
    const trimmedPin = sharePin.trim()
    if (trimmedPin && !/^\d{4,8}$/.test(trimmedPin)) {
      setError('PIN must be 4-8 digits.')
      return
    }
    if (shareScope === 'specialty' && !shareSpecialty) {
      setError('Track a specialty before creating a specialty-scoped link.')
      return
    }

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

    let res: Response
    let json: Partial<ShareLink> & { error?: string; limit?: number } = {}
    try {
      res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          scope: shareScope,
          specialty_key: shareScope === 'specialty' ? shareSpecialty : null,
          theme_slug: shareScope === 'theme' ? shareTheme : null,
          expires_at: expiresAt,
          pin: trimmedPin || null,
          hide_notes: hideNotes,
          hide_reflection: hideReflection,
          redact_tags: redactTags,
          view_webhook_url: viewWebhookUrl.trim() || null,
        }),
      })
      json = await res.json().catch(() => ({}))
    } catch {
      setShareLoading(false)
      setError('Could not create share link. Check your connection and try again.')
      return
    }
    setShareLoading(false)
    if (!res.ok) {
      setError(json.error === 'limit_reached' ? `You've used your ${json.limit} free share link. Upgrade or revoke one to free a slot.` : json.error ?? 'Could not create share link.')
      return
    }
    setShareLinks(prev => [json as ShareLink, ...prev])
    setSharePin('')
    setViewWebhookUrl('')
  }

  async function revokeShareLink(id: string) {
    setRevokingLink(id)
    const { ok } = await apiFetch(`/api/share?id=${id}`, { method: 'DELETE' })
    if (ok) {
      setShareLinks(prev => prev.filter(link => link.id !== id))
      setConfirmRevoke(null)
      addToast('Share link revoked', 'success')
    } else {
      setError('Could not revoke share link. Please try again.')
    }
    setRevokingLink(null)
  }

  async function renewShareLink(id: string) {
    const { ok, data } = await apiFetch<{ expires_at: string; error?: string }>('/api/share', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, days: 30 }),
    })
    if (ok && data) {
      const expiresAt = data.expires_at
      setShareLinks(prev => prev.map(link => link.id === id ? { ...link, expires_at: expiresAt } : link))
      addToast(`Share link renewed - expires ${formatDate(expiresAt)}`, 'success')
    } else {
      setError(data?.error ?? 'Could not renew share link. Please try again.')
    }
  }

  async function copyLink(token: string) {
    const url = `${window.location.origin}/share/${token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedToken(token)
      setError(null)
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => setCopiedToken(null), 1500)
    } catch {
      setError(`Clipboard unavailable. Copy this share URL manually: ${url}`)
    }
  }

  return (
    <div className="max-w-container mx-auto p-6 lg:p-8">
      <div className="mb-4">
        <Link href="/portfolio" className="text-sm text-fg-2 transition-colors hover:text-fg">← Back to portfolio</Link>
      </div>

      <SectionHeader
        title="Import & export"
        sub="Import an existing portfolio, generate application packs, back up your data, and create protected portfolio links."
        actions={
          <>
            {subInfo && !subInfo.isPro && (
              <Link href="/upgrade" className="rounded-lg border border-pill-amber bg-pill-amber px-4 py-2 text-sm font-medium text-amber-300 transition-colors hover:border-default">
                Free plan limits active
              </Link>
            )}
            <Link href="/export/cv" prefetch={false} className="rounded-lg border border-subtle bg-surface-1 px-4 py-2 text-sm font-medium text-fg hover:border-default transition-colors">
              CV generator
            </Link>
            <Link href="/export/linkedin" className="rounded-lg border border-subtle bg-surface-1 px-4 py-2 text-sm font-medium text-fg hover:border-default transition-colors">
              LinkedIn snippets
            </Link>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap gap-1 rounded-lg border border-subtle bg-surface-1 p-1">
        {(['import', 'pdf', 'backup', 'share'] as Tab[]).map(item => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`rounded px-4 py-2 text-sm font-medium transition-colors ${tab === item ? 'bg-blue-500 text-white' : 'text-fg-2 hover:bg-surface-3 hover:text-fg'}`}
          >
            {item === 'import' ? 'Import' : item === 'pdf' ? 'Application PDF' : item === 'backup' ? 'Data backup' : 'Share links'}
          </button>
        ))}
      </div>

      {error && (
        <div ref={errorRef} role="alert" className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {tab !== 'backup' && tab !== 'import' && (
        <div className="mb-4 rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Target specialty</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {[
              { value: ALL_RECORDS, label: 'All records' },
              { value: UNTAGGED_RECORDS, label: 'Untagged' },
            ].map(option => (
              <button key={option.value} onClick={() => setSpecialty(option.value)} className={specialtyChipClass(specialty === option.value)}>
                {option.label}
              </button>
            ))}
          </div>
          {trackedSpecialtyOptions.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Tracked specialties</p>
              <div className="flex flex-wrap gap-2">
                {trackedSpecialtyOptions.map(({ key, count }) => (
                  <button key={key} onClick={() => setSpecialty(current => current === key ? '' : key)} className={specialtyChipClass(specialty === key)}>
                    {formatSpecialtyLabel(key)} <span className="ml-1 text-xs opacity-60">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {linkedOnlyOptions.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Tagged in your entries</p>
              <div className="flex flex-wrap gap-2">
                {linkedOnlyOptions.map(({ tag, count }) => (
                  <button key={tag} onClick={() => setSpecialty(current => current === tag ? '' : tag)} className={specialtyChipClass(specialty === tag)}>
                    {formatSpecialtyLabel(tag)} <span className="ml-1 text-xs opacity-60">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Show the formatted label when a tracked-specialty chip is active
              so the field doesn't leak raw slugs like 'acute_internal_medicine'.
              When the user types into the field we treat their input as a
              free-text override and store it verbatim - that's the slug we
              send to the API for filtering. */}
          <input
            value={specialty === ALL_RECORDS || specialty === UNTAGGED_RECORDS
              ? exportScopeLabel(specialty)
              : portfolioTags.some(t => t.tag === specialty) || trackedApps.some(a => a.specialty_key === specialty)
              ? formatSpecialtyLabel(specialty)
              : specialty}
            onChange={e => setSpecialty(e.target.value)}
            onFocus={e => e.currentTarget.select()}
            placeholder="Or type any specialty..."
            className="w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)]"
          />
        </div>
      )}

      {tab === 'import' && (
        <section className="space-y-4">
          {subInfo && !subInfo.isPro && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs">
              <p className="font-semibold text-amber-300">Bulk import is a Pro feature</p>
              <p className="mt-1 text-[var(--text-secondary)]">
                Importing from Horus, a spreadsheet, or a backup is available on Pro. You can still add entries manually on Free.
                {' '}<Link href="/upgrade" className="text-[var(--accent-text)] underline">Upgrade for £9.99/yr</Link>.
              </p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/import" className="rounded-2xl border border-[var(--accent)] bg-[var(--bg-surface)] p-5 transition-colors hover:border-[var(--accent)] sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Import from Horus</h2>
                <span className="rounded-full border border-[var(--accent)] bg-[var(--accent)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent-text)]">Recommended</span>
              </div>
              <p className="mt-1.5 text-sm text-[var(--text-secondary)]">Bring your NHS foundation e-portfolio (supervised learning events, reflections) straight in from a Horus CSV export. Other foundation portfolio exports with date / type / title columns work too.</p>
            </Link>
            <Link href="/import/csv" className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5 transition-colors hover:border-white/[0.16]">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">CSV / spreadsheet</h2>
              <p className="mt-1.5 text-sm text-[var(--text-secondary)]">Map columns from any CSV (MicroGuide, NHS Learn, or your own) to portfolio entries or cases.</p>
            </Link>
            <Link href="/import/json" className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5 transition-colors hover:border-white/[0.16]">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Clerkfolio backup</h2>
              <p className="mt-1.5 text-sm text-[var(--text-secondary)]">Restore from a Clerkfolio JSON backup — the file you download from the Data backup tab.</p>
            </Link>
          </div>
        </section>
      )}

      {tab === 'pdf' && (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            {format === 'pdf' && subInfo && !subInfo.isPro && (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs">
                <p className="mb-1 font-semibold text-amber-300">
                  {subInfo.limits.canExportPdf
                    ? '1 of 1 PDF remaining on Free'
                    : 'PDF cap reached on Free'}
                </p>
                <p className="text-[var(--text-secondary)]">
                  Application PDF, appended PDFs, Year in review and CV downloads share this allowance. CSV and JSON exports stay unlimited on every tier. Pro removes the PDF cap.
                  {' '}<Link href="/upgrade" className="text-[var(--accent-text)] underline">Upgrade for £9.99/yr</Link>.
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Format</p>
              <div className="flex gap-2">
                {(['pdf', 'csv', 'json'] as ExportFormat[]).map(f => (
                  <button key={f} onClick={() => setFormat(f)} className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium ${format === f ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]' : 'border-white/[0.06] bg-white/[0.04] text-[var(--text-secondary)]'}`}>
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                {format === 'pdf' && 'Formatted portfolio for ARCP panels, applications, or printing.'}
                {format === 'csv' && 'Spreadsheet for sorting, filtering, or pivoting your records.'}
                {format === 'json' && 'Raw data dump for backups or scripting.'}
              </p>
            </div>

            {format === 'pdf' && (
              <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Template</p>
                <select value={pdfTemplate} onChange={e => setPdfTemplate(e.target.value as PdfTemplate)} className="w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
                  <option value="default">Default</option>
                  <option value="foundation">Foundation portfolio</option>
                  <option value="mrcp">MRCP</option>
                  <option value="st_application">ST application</option>
                </select>
                <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                  {pdfTemplate === 'default' && 'Clean general-purpose layout, grouped by category.'}
                  {pdfTemplate === 'foundation' && 'Foundation Programme layout grouped by ARCP capability.'}
                  {pdfTemplate === 'mrcp' && 'Tailored to MRCP application section ordering.'}
                  {pdfTemplate === 'st_application' && 'Higher specialty (ST3+) self-assessment layout.'}
                </p>
              </div>
            )}

            {themes.length > 0 && (
              <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Theme filter</p>
                <select value={themeFilter} onChange={e => setThemeFilter(e.target.value)} className="w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
                  <option value="">Any theme</option>
                {themes.map(theme => <option key={theme} value={theme}>{formatCompetencyTheme(theme)}</option>)}
                </select>
              </div>
            )}

            {loadedSpecialty && (
              <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Category</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setCategoryFilter('all')} className={`rounded-lg border px-3 py-1.5 text-sm ${categoryFilter === 'all' ? 'border-white/[0.15] bg-white/[0.1] text-[var(--text-primary)]' : 'border-white/[0.06] bg-white/[0.04] text-[var(--text-secondary)]'}`}>All</button>
                  {CATEGORIES.filter(c => categoriesPresent.includes(c.value)).map(cat => (
                    <button key={cat.value} onClick={() => setCategoryFilter(cat.value)} className={`rounded-lg border px-3 py-1.5 text-sm ${categoryFilter === cat.value ? 'border-white/[0.15] bg-white/[0.1] text-[var(--text-primary)]' : 'border-white/[0.06] bg-white/[0.04] text-[var(--text-secondary)]'}`}>{cat.short}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Fields</p>
              <div className="space-y-2">
                {EXPORT_FIELDS.map(field => (
                  <label key={field.value} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.value)}
                      onChange={e => setSelectedFields(current => e.target.checked ? [...current, field.value] : current.filter(value => value !== field.value))}
                    />
                    {field.label}
                  </label>
                ))}
              </div>
            </div>

            {format === 'pdf' && (
              <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Append PDF</p>
                <p className="mb-3 text-[11px] text-[var(--text-muted)]">
                  Attach an existing PDF (CV, cover letter, supporting evidence) to the end of the export.
                </p>
                <input type="file" accept="application/pdf,.pdf" onChange={e => setAppendPdfFile(e.target.files?.[0] ?? null)} className="block w-full text-xs text-[var(--text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-white/[0.08] file:px-3 file:py-2 file:text-xs file:text-[var(--text-primary)]" />
                <button
                  onClick={handleAppendPdf}
                  disabled={!appendPdfFile || selectedEntryIds.size === 0 || appendingPdf}
                  title={!appendPdfFile ? 'Choose a PDF first' : selectedEntryIds.size === 0 ? 'Select at least one entry' : undefined}
                  className="mt-3 min-h-[40px] w-full rounded-xl border border-white/[0.08] px-4 text-sm font-medium text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {appendingPdf ? 'Appending...' : 'Append selected'}
                </button>
              </div>
            )}
          </aside>

          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)]">
            <div className="flex flex-col gap-3 border-b border-white/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                {loading ? 'Loading...' : `${visible.length} entries, ${visibleCases.length} cases - ${totalSelected} selected`}
              </p>
              {format === 'pdf' && visibleCases.length > 0 && (
                <p className="text-xs text-[var(--text-muted)]">Cases export as CSV or JSON. PDFs include portfolio entries only.</p>
              )}
              <div className="flex items-center gap-3">
                <button onClick={() => { setSelectedEntryIds(new Set(visible.map(e => e.id))); setSelectedCaseIds(new Set(visibleCases.map(c => c.id))) }} className="text-xs text-[var(--accent-text)]">Select visible</button>
                <button onClick={() => { setSelectedEntryIds(new Set()); setSelectedCaseIds(new Set()) }} className="text-xs text-[var(--text-muted)]">Clear</button>
                <button onClick={handleGenerate} disabled={!canGenerate} title={totalSelected === 0 ? 'Select at least one entry' : undefined} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed">
                  {generating ? 'Generating...' : `Export ${format.toUpperCase()}`}
                </button>
              </div>
            </div>

            {!specialty ? (
              <div className="p-8 text-sm text-[var(--text-muted)]">Choose a target specialty above to load your portfolio.</div>
            ) : loading ? (
              <div className="p-8 text-sm text-[var(--text-muted)]">Loading entries for {exportScopeLabel(specialty)}...</div>
            ) : visible.length === 0 && visibleCases.length === 0 ? (
              selectedIsRealSpecialty && categoryFilter === 'all' ? (
                <div className="p-8 text-sm text-[var(--text-muted)]">
                  No entries linked to {exportScopeLabel(specialty)} yet — tag entries with {exportScopeLabel(specialty)} in the entry&apos;s &ldquo;Linked specialties&rdquo; field to include them here.
                </div>
              ) : (
                <div className="p-8 text-sm text-[var(--text-muted)]">No entries or cases found for {exportScopeLabel(specialty)}{categoryFilter !== 'all' ? ` in ${categoryFilter}` : ''}.</div>
              )
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {visible.map(entry => {
                  const checked = selectedEntryIds.has(entry.id)
                  const colour = CATEGORY_COLOURS[entry.category]
                  const label = CATEGORIES.find(c => c.value === entry.category)?.short ?? entry.category
                  return (
                    <label key={entry.id} className={`flex cursor-pointer items-center gap-4 px-5 py-3.5 transition-colors ${checked ? 'bg-[var(--accent)]' : 'hover:bg-white/[0.02]'}`}>
                      <input type="checkbox" checked={checked} onChange={() => setSelectedEntryIds(prev => {
                        const next = new Set(prev)
                        next.has(entry.id) ? next.delete(entry.id) : next.add(entry.id)
                        return next
                      })} className="h-4 w-4 accent-[var(--accent-text)]" />
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex flex-wrap items-center gap-2">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${colour.bg} ${colour.text}`}>{label}</span>
                          <span className="truncate text-sm text-[var(--text-primary)]">{entry.title}</span>
                        </div>
                        {entrySubtitle(entry) && <p className="truncate text-xs capitalize text-[var(--text-muted)]">{entrySubtitle(entry)}</p>}
                      </div>
                      <span className="shrink-0 text-xs text-[var(--text-secondary)]">{formatDate(entry.date)}</span>
                      <button
                        type="button"
                        title="Download every uploaded evidence file for this entry as a single ZIP."
                        onClick={e => {
                          e.preventDefault()
                          e.stopPropagation()
                          downloadEvidenceZip(entry.id, entry.title)
                        }}
                        className="shrink-0 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        Evidence ZIP
                      </button>
                    </label>
                  )
                })}
                {format !== 'pdf' && visibleCases.map(c => {
                  const checked = selectedCaseIds.has(c.id)
                  const areas = c.clinical_domains?.length ? c.clinical_domains : c.clinical_domain ? [c.clinical_domain] : []
                  return (
                    <label key={c.id} className={`flex cursor-pointer items-center gap-4 px-5 py-3.5 transition-colors ${checked ? 'bg-[var(--accent)]' : 'hover:bg-white/[0.02]'}`}>
                      <input type="checkbox" checked={checked} onChange={() => setSelectedCaseIds(prev => {
                        const next = new Set(prev)
                        next.has(c.id) ? next.delete(c.id) : next.add(c.id)
                        return next
                      })} className="h-4 w-4 accent-[var(--accent-text)]" />
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex flex-wrap items-center gap-2">
                          <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-medium text-cyan-400">Case</span>
                          <span className="truncate text-sm text-[var(--text-primary)]">{c.title}</span>
                        </div>
                        {areas.length > 0 && <p className="truncate text-xs text-[var(--text-muted)]">{areas.join(' - ')}</p>}
                      </div>
                      <span className="shrink-0 text-xs text-[var(--text-secondary)]">{formatDate(c.date)}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'backup' && (
        <section className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Full data backup</h2>
          <p className="mt-2 max-w-2xl mx-auto text-sm leading-relaxed text-[var(--text-muted)]">
            Download a ZIP containing your profile, portfolio entries, cases, deadlines, goals, specialty scoring links, templates, and evidence files.
          </p>
          <label className="mt-4 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input type="checkbox" checked={includeEvidenceBackup} onChange={e => setIncludeEvidenceBackup(e.target.checked)} />
            Include evidence files
          </label>
          {subInfo && !subInfo.isPro && (
            <div className="mt-5 max-w-2xl rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-100">
              <p className="font-semibold">
                {subInfo.limits.canExportPdf ? '1 of 1 PDF remaining' : 'PDF allowance used'}
              </p>
              <p className="mt-1 text-[var(--text-secondary)]">
                Year in review PDF shares your single included PDF download with Application PDF, appended PDF and CV downloads.
              </p>
            </div>
          )}
          <button onClick={handleBackup} disabled={backupLoading} className="mt-6 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {backupLoading ? 'Preparing backup...' : 'Download ZIP backup'}
          </button>
          <button
            type="button"
            onClick={handleYearReview}
            disabled={yearReviewLoading || Boolean(subInfo && !subInfo.isPro && !subInfo.limits.canExportPdf)}
            className="ml-3 inline-flex min-h-[40px] items-center rounded-xl border border-white/[0.08] px-4 text-sm font-medium text-[var(--text-primary)] hover:border-white/[0.16] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {yearReviewLoading ? 'Generating...' : 'Year in review PDF'}
          </button>
          <button
            type="button"
            onClick={handleMarkdownExport}
            disabled={markdownLoading}
            className="ml-3 inline-flex min-h-[40px] items-center rounded-xl border border-white/[0.08] px-4 text-sm font-medium text-[var(--text-primary)] hover:border-white/[0.16] disabled:opacity-50"
          >
            {markdownLoading ? 'Exporting...' : 'Reflections MD'}
          </button>
        </section>
      )}

      {tab === 'share' && (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <section className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Create protected link</h2>
            {subInfo && !subInfo.isPro && (
              <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-200">
                <p className="font-semibold">
                  {canCreateShareLink
                    ? '1 of 1 share link available on Free'
                    : hasActiveShareLinks
                      ? 'Active link cap reached'
                      : 'Share link cap reached on Free'}
                </p>
                <p className="mt-0.5 text-[var(--text-secondary)]">
                  {canCreateShareLink
                    ? 'Revoke an existing link to create another, or upgrade for unlimited links.'
                    : hasActiveShareLinks
                      ? 'Revoke an existing link or upgrade to Pro for unlimited links.'
                      : 'Free tier includes 1 active share link. Upgrade to Pro for unlimited links.'}
                </p>
              </div>
            )}
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Scope</span>
                <select value={shareScope} onChange={e => setShareScope(e.target.value as ShareScope)} className="w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
                  <option value="specialty">Tracked specialty</option>
                  <option value="theme">Competency theme</option>
                  <option value="full">Full portfolio (entries only)</option>
                </select>
                {shareScope === 'full' && (
                  <p className="mt-1.5 text-xs text-[var(--text-muted)]">Shares all your portfolio entries. Cases are never shared.</p>
                )}
              </label>
              {shareScope === 'specialty' && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Specialty</span>
                  <select value={shareSpecialty} onChange={e => setShareSpecialty(e.target.value)} className="w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
                    {trackedApps.length === 0 && <option value="">No tracked specialties</option>}
                    {trackedApps.map(app => <option key={app.id} value={app.specialty_key}>{formatSpecialtyLabel(app.specialty_key)}</option>)}
                  </select>
                  {trackedApps.length === 0 && <p className="mt-1 text-xs text-amber-200">Track a specialty before creating this type of link.</p>}
                </label>
              )}
              {shareScope === 'theme' && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Theme</span>
                  <input value={shareTheme} onChange={e => setShareTheme(e.target.value)} list="themes" className="w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm text-[var(--text-primary)]" />
                  <datalist id="themes">{themes.map(theme => <option key={theme} value={theme} label={formatCompetencyTheme(theme)} />)}</datalist>
                </label>
              )}
              <div>
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Expires</span>
                <div className="grid grid-cols-2 gap-2">
                  {EXPIRY_PRESETS.map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setExpiryPreset(preset.days)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        expiryPreset === preset.days
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]'
                          : 'border-white/[0.08] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
                    className="mt-2 w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm text-[var(--text-primary)]"
                  />
                )}
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">PIN</span>
                <input value={sharePin} onChange={e => setSharePin(e.target.value)} inputMode="numeric" pattern="[0-9]{4,8}" placeholder="Optional PIN (4-8 digits)" className="w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm text-[var(--text-primary)]" />
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Optional PIN (4-8 digits)</p>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">View webhook</span>
                <input
                  value={viewWebhookUrl}
                  onChange={e => setViewWebhookUrl(e.target.value)}
                  placeholder="https://example.com/share-viewed"
                  className="w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm text-[var(--text-primary)]"
                />
              </label>
              <div className="space-y-2 rounded-xl border border-white/[0.08] bg-[var(--bg-canvas)] p-3">
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input type="checkbox" checked={hideNotes} onChange={e => setHideNotes(e.target.checked)} />
                  Hide notes
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input type="checkbox" checked={hideReflection} onChange={e => setHideReflection(e.target.checked)} />
                  Hide reflection text
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input type="checkbox" checked={redactTags} onChange={e => setRedactTags(e.target.checked)} />
                  Redact tags
                </label>
              </div>
              <button type="button" onClick={createShareLink} disabled={shareLoading || !canCreateShareLink || (shareScope === 'specialty' && !shareSpecialty)} className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed">
                {shareLoading ? 'Creating...' : 'Create link'}
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)]">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Active links</h2>
            </div>
            {shareLinks.length === 0 ? (
              <p className="p-6 text-sm text-[var(--text-muted)]">No active share links.</p>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {shareLinks.map(link => (
                  <article key={link.id} className="p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{shareLabel(link)}</p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">Expires {formatDate(link.expires_at)} - {link.view_count ?? 0} views</p>
                        {link.view_webhook_url && <p className="mt-1 text-xs text-emerald-300">Webhook enabled</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => copyLink(link.token)} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">{copiedToken === link.token ? 'Copied' : 'Copy'}</button>
                        <a href={`/share/${link.token}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Preview</a>
                        <button onClick={() => renewShareLink(link.id)} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Renew</button>
                        {confirmRevoke === link.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setConfirmRevoke(null)}
                              disabled={revokingLink === link.id}
                              className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-[var(--text-secondary)] disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => revokeShareLink(link.id)}
                              disabled={revokingLink === link.id}
                              className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 disabled:opacity-50"
                            >
                              {revokingLink === link.id ? 'Revoking...' : 'Confirm revoke'}
                            </button>
                          </>
                        ) : (
                          <button onClick={() => setConfirmRevoke(link.id)} className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-300">Revoke</button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
