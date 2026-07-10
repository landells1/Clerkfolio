'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { type Category, type PortfolioEntry } from '@/lib/types/portfolio'
import type { Case } from '@/lib/types/cases'
import { fetchSubscriptionInfo, type SubscriptionInfo } from '@/lib/subscription'
import { apiFetch, NETWORK_ERROR_MESSAGE } from '@/lib/api-fetch'
import SectionHeader from '@/components/ui/section-header'
import { useToast } from '@/components/ui/toast-provider'
import {
  ALL_RECORDS,
  UNTAGGED_RECORDS,
  EXPORT_FIELDS,
  exportScopeLabel,
  formatDate,
  type ExportFormat,
  type PdfTemplate,
  type ShareScope,
  type ShareLink,
  type TrackedApp,
  type TagCount,
} from '@/components/export/shared'
import { TargetSpecialtyPicker } from '@/components/export/target-specialty-picker'
import { ImportTab } from '@/components/export/import-tab'
import { PdfExportTab } from '@/components/export/pdf-export-tab'
import { BackupTab } from '@/components/export/backup-tab'
import { ShareTab } from '@/components/export/share-tab'

type Tab = 'import' | 'pdf' | 'backup' | 'share'
type EntrySpecialtyFields = { specialty_tags: string[] | null }

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
      setError(json.error === 'limit_reached' ? `You've used your ${json.limit} included PDF export. Year in review, Application PDF and CV PDF/DOCX downloads share this allowance.` : json.error ?? 'Could not generate year in review PDF.')
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
      setError(json.error === 'limit_reached' ? `You've used your ${json.limit} included PDF export. Appended PDFs, Year in review, Application PDF and CV PDF/DOCX downloads share this allowance.` : json.error ?? 'Could not append entries to PDF.')
      return
    }
    await downloadBlob(response, `clerkfolio-appended-${new Date().toISOString().split('T')[0]}.pdf`)
    await refreshSubscriptionInfo()
  }

  async function handleMarkdownExport() {
    setMarkdownLoading(true)
    setError(null)
    try {
      const { ok, status, response } = await apiFetch('/api/export/markdown', { parse: 'none' })
      if (status === null) {
        setError(NETWORK_ERROR_MESSAGE)
        return
      }
      if (!ok || !response) {
        const json = (await response?.json().catch(() => ({}))) ?? {}
        setError(json.error ?? 'Could not export reflections. Please try again.')
        return
      }
      await downloadBlob(response, `clerkfolio-reflections-${new Date().toISOString().split('T')[0]}.md`)
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

    const { ok, status, data } = await apiFetch<Partial<ShareLink> & { error?: string; limit?: number }>('/api/share', {
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
    setShareLoading(false)
    if (status === null) {
      setError('Could not create share link. Check your connection and try again.')
      return
    }
    const json = data ?? {}
    if (!ok) {
      setError(json.error === 'limit_reached' ? `You've used your ${json.limit} free share link${json.limit === 1 ? '' : 's'}. Upgrade or revoke one to free a slot.` : json.error ?? 'Could not create share link.')
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
              <Link href="/upgrade" className="rounded-lg border border-pill-amber bg-pill-amber px-4 py-2 text-sm font-medium text-[var(--warning)] transition-colors hover:border-default">
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
            className={`rounded px-4 py-2 text-sm font-medium transition-colors ${tab === item ? 'bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]' : 'text-fg-2 hover:bg-surface-3 hover:text-fg'}`}
          >
            {item === 'import' ? 'Import' : item === 'pdf' ? 'Application PDF' : item === 'backup' ? 'Data backup' : 'Share links'}
          </button>
        ))}
      </div>

      {error && (
        <div ref={errorRef} role="alert" className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {tab !== 'backup' && tab !== 'import' && (
        <TargetSpecialtyPicker
          specialty={specialty}
          setSpecialty={setSpecialty}
          portfolioTags={portfolioTags}
          trackedApps={trackedApps}
          trackedSpecialtyOptions={trackedSpecialtyOptions}
          linkedOnlyOptions={linkedOnlyOptions}
        />
      )}

      {tab === 'import' && <ImportTab subInfo={subInfo} />}

      {tab === 'pdf' && (
        <PdfExportTab
          subInfo={subInfo}
          format={format}
          setFormat={setFormat}
          pdfTemplate={pdfTemplate}
          setPdfTemplate={setPdfTemplate}
          themes={themes}
          themeFilter={themeFilter}
          setThemeFilter={setThemeFilter}
          loadedSpecialty={loadedSpecialty}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          categoriesPresent={categoriesPresent}
          selectedFields={selectedFields}
          setSelectedFields={setSelectedFields}
          appendPdfFile={appendPdfFile}
          setAppendPdfFile={setAppendPdfFile}
          appendingPdf={appendingPdf}
          onAppendPdf={handleAppendPdf}
          specialty={specialty}
          selectedIsRealSpecialty={selectedIsRealSpecialty}
          loading={loading}
          visible={visible}
          visibleCases={visibleCases}
          totalSelected={totalSelected}
          generating={generating}
          canGenerate={canGenerate}
          onGenerate={handleGenerate}
          selectedEntryIds={selectedEntryIds}
          setSelectedEntryIds={setSelectedEntryIds}
          selectedCaseIds={selectedCaseIds}
          setSelectedCaseIds={setSelectedCaseIds}
          onDownloadEvidenceZip={downloadEvidenceZip}
        />
      )}

      {tab === 'backup' && (
        <BackupTab
          subInfo={subInfo}
          includeEvidenceBackup={includeEvidenceBackup}
          setIncludeEvidenceBackup={setIncludeEvidenceBackup}
          backupLoading={backupLoading}
          onBackup={handleBackup}
          yearReviewLoading={yearReviewLoading}
          onYearReview={handleYearReview}
          markdownLoading={markdownLoading}
          onMarkdownExport={handleMarkdownExport}
        />
      )}

      {tab === 'share' && (
        <ShareTab
          subInfo={subInfo}
          canCreateShareLink={canCreateShareLink}
          hasActiveShareLinks={hasActiveShareLinks}
          shareScope={shareScope}
          setShareScope={setShareScope}
          shareSpecialty={shareSpecialty}
          setShareSpecialty={setShareSpecialty}
          trackedApps={trackedApps}
          shareTheme={shareTheme}
          setShareTheme={setShareTheme}
          themes={themes}
          expiryPreset={expiryPreset}
          setExpiryPreset={setExpiryPreset}
          customExpiry={customExpiry}
          setCustomExpiry={setCustomExpiry}
          sharePin={sharePin}
          setSharePin={setSharePin}
          viewWebhookUrl={viewWebhookUrl}
          setViewWebhookUrl={setViewWebhookUrl}
          hideNotes={hideNotes}
          setHideNotes={setHideNotes}
          hideReflection={hideReflection}
          setHideReflection={setHideReflection}
          redactTags={redactTags}
          setRedactTags={setRedactTags}
          shareLoading={shareLoading}
          onCreate={createShareLink}
          shareLinks={shareLinks}
          copiedToken={copiedToken}
          onCopy={copyLink}
          onRenew={renewShareLink}
          confirmRevoke={confirmRevoke}
          setConfirmRevoke={setConfirmRevoke}
          revokingLink={revokingLink}
          onRevoke={revokeShareLink}
        />
      )}
    </div>
  )
}
