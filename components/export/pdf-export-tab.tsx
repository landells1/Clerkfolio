'use client'

import type { Dispatch, SetStateAction } from 'react'
import Link from 'next/link'
import { CATEGORIES, CATEGORY_COLOURS, type Category, type PortfolioEntry } from '@/lib/types/portfolio'
import { entrySubtitle as buildEntrySubtitle, formatCompetencyTheme } from '@/lib/types/portfolio-labels'
import type { Case } from '@/lib/types/cases'
import type { SubscriptionInfo } from '@/lib/subscription'
import {
  EXPORT_FIELDS,
  exportScopeLabel,
  formatDate,
  type ExportFormat,
  type PdfTemplate,
} from './shared'

function entrySubtitle(e: PortfolioEntry): string | null {
  return buildEntrySubtitle(e) || null
}

// Application PDF tab: format/template/filter sidebar plus the selectable
// entry and case list. All state and the export handlers live in the page.
export function PdfExportTab({
  subInfo,
  format,
  setFormat,
  pdfTemplate,
  setPdfTemplate,
  themes,
  themeFilter,
  setThemeFilter,
  loadedSpecialty,
  categoryFilter,
  setCategoryFilter,
  categoriesPresent,
  selectedFields,
  setSelectedFields,
  appendPdfFile,
  setAppendPdfFile,
  appendingPdf,
  onAppendPdf,
  specialty,
  selectedIsRealSpecialty,
  loading,
  visible,
  visibleCases,
  totalSelected,
  generating,
  canGenerate,
  onGenerate,
  selectedEntryIds,
  setSelectedEntryIds,
  selectedCaseIds,
  setSelectedCaseIds,
  onDownloadEvidenceZip,
}: {
  subInfo: SubscriptionInfo | null
  format: ExportFormat
  setFormat: (format: ExportFormat) => void
  pdfTemplate: PdfTemplate
  setPdfTemplate: (template: PdfTemplate) => void
  themes: string[]
  themeFilter: string
  setThemeFilter: (theme: string) => void
  loadedSpecialty: string | null
  categoryFilter: Category | 'all'
  setCategoryFilter: (category: Category | 'all') => void
  categoriesPresent: Category[]
  selectedFields: string[]
  setSelectedFields: Dispatch<SetStateAction<string[]>>
  appendPdfFile: File | null
  setAppendPdfFile: (file: File | null) => void
  appendingPdf: boolean
  onAppendPdf: () => void
  specialty: string
  selectedIsRealSpecialty: boolean
  loading: boolean
  visible: PortfolioEntry[]
  visibleCases: Case[]
  totalSelected: number
  generating: boolean
  canGenerate: boolean
  onGenerate: () => void
  selectedEntryIds: Set<string>
  setSelectedEntryIds: Dispatch<SetStateAction<Set<string>>>
  selectedCaseIds: Set<string>
  setSelectedCaseIds: Dispatch<SetStateAction<Set<string>>>
  onDownloadEvidenceZip: (entryId: string, title: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        {format === 'pdf' && subInfo && !subInfo.isPro && (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs">
            <p className="mb-1 font-semibold text-[var(--warning)]">
              {subInfo.limits.canExportPdf
                ? '1 of 1 PDF remaining on Free'
                : 'PDF cap reached on Free'}
            </p>
            <p className="text-[var(--text-secondary)]">
              Application PDF, appended PDFs, Year in review and CV PDF/DOCX downloads share this allowance. CSV and JSON exports stay unlimited on every tier. Pro removes the PDF cap.
              {' '}<Link href="/upgrade" className="text-[var(--accent-text)] underline">Upgrade for £9.99/yr</Link>.
              {!subInfo.limits.canExportPdf && (
                <>
                  {' '}Or <Link href="/settings/referrals" className="text-[var(--accent-text)] underline">invite a colleague</Link>. Each successful referral adds one more free PDF export.
                </>
              )}
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--text-emphasis)]">Format</p>
          <div className="flex gap-2">
            {(['pdf', 'csv', 'json'] as ExportFormat[]).map(f => (
              <button key={f} onClick={() => setFormat(f)} className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium ${format === f ? 'border-accent/30 bg-[var(--accent-soft)] text-[var(--accent-soft-text)]' : 'border-white/[0.06] bg-white/[0.04] text-[var(--text-secondary)]'}`}>
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
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--text-emphasis)]">Template</p>
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
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--text-emphasis)]">Theme filter</p>
            <select value={themeFilter} onChange={e => setThemeFilter(e.target.value)} className="w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
              <option value="">Any theme</option>
            {themes.map(theme => <option key={theme} value={theme}>{formatCompetencyTheme(theme)}</option>)}
            </select>
          </div>
        )}

        {loadedSpecialty && (
          <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--text-emphasis)]">Category</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setCategoryFilter('all')} className={`rounded-lg border px-3 py-1.5 text-sm ${categoryFilter === 'all' ? 'border-white/[0.15] bg-white/[0.1] text-[var(--text-primary)]' : 'border-white/[0.06] bg-white/[0.04] text-[var(--text-secondary)]'}`}>All</button>
              {CATEGORIES.filter(c => categoriesPresent.includes(c.value)).map(cat => (
                <button key={cat.value} onClick={() => setCategoryFilter(cat.value)} className={`rounded-lg border px-3 py-1.5 text-sm ${categoryFilter === cat.value ? 'border-white/[0.15] bg-white/[0.1] text-[var(--text-primary)]' : 'border-white/[0.06] bg-white/[0.04] text-[var(--text-secondary)]'}`}>{cat.short}</button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--text-emphasis)]">Fields</p>
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
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--text-emphasis)]">Append PDF</p>
            <p className="mb-3 text-[11px] text-[var(--text-muted)]">
              Attach an existing PDF (CV, cover letter, supporting evidence) to the end of the export.
            </p>
            <input type="file" accept="application/pdf,.pdf" onChange={e => setAppendPdfFile(e.target.files?.[0] ?? null)} className="block w-full text-xs text-[var(--text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-white/[0.08] file:px-3 file:py-2 file:text-xs file:text-[var(--text-primary)]" />
            <button
              onClick={onAppendPdf}
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
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-emphasis)]">
            {loading ? 'Loading...' : `${visible.length} entries, ${visibleCases.length} cases - ${totalSelected} selected`}
          </p>
          {format === 'pdf' && visibleCases.length > 0 && (
            <p className="text-xs text-[var(--text-muted)]">Cases export as CSV or JSON. PDFs include portfolio entries only.</p>
          )}
          <div className="flex items-center gap-3">
            <button onClick={() => { setSelectedEntryIds(new Set(visible.map(e => e.id))); setSelectedCaseIds(new Set(visibleCases.map(c => c.id))) }} className="text-xs text-[var(--accent-text)]">Select visible</button>
            <button onClick={() => { setSelectedEntryIds(new Set()); setSelectedCaseIds(new Set()) }} className="text-xs text-[var(--text-muted)]">Clear</button>
            <button onClick={onGenerate} disabled={!canGenerate} title={totalSelected === 0 ? 'Select at least one entry' : undefined} className="rounded-lg bg-[var(--button-primary-bg)] px-4 py-2 text-sm font-semibold text-[var(--button-primary-text)] disabled:opacity-40 disabled:cursor-not-allowed">
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
                <label key={entry.id} className={`flex cursor-pointer items-center gap-4 px-5 py-3.5 transition-colors ${checked ? 'bg-accent/5' : 'hover:bg-white/[0.02]'}`}>
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
                      onDownloadEvidenceZip(entry.id, entry.title)
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
                <label key={c.id} className={`flex cursor-pointer items-center gap-4 px-5 py-3.5 transition-colors ${checked ? 'bg-accent/5' : 'hover:bg-white/[0.02]'}`}>
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
  )
}
