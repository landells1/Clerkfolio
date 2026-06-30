'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Papa from 'papaparse'
import { CATEGORIES } from '@/lib/types/portfolio'
import { apiFetch, NETWORK_ERROR_MESSAGE } from '@/lib/api-fetch'

// Known Horus and foundation e-portfolio column names (case-insensitive matching)
const COL_DATE         = ['date', 'event date', 'created date', 'completion date', 'signed date']
const COL_TYPE         = ['type', 'assessment type', 'event type', 'form type', 'entry type', 'activity type']
const COL_TITLE        = ['title', 'subject', 'case / problem', 'case/problem', 'patient problem', 'topic', 'activity', 'description', 'summary']
const COL_SUPERVISOR   = ['supervisor', 'assessor', 'supervisor name', 'assessor name']
const COL_GRADE        = ['grade', 'level', 'outcome']
const COL_COMMENTS     = ['comments', 'feedback', 'comment', 'supervisor comments', 'assessor comments', 'reflection', 'learning points', 'notes']
const COL_SETTING      = ['clinical setting', 'setting', 'location', 'placement']

type HorusRow = {
  rawIndex: number
  date: string
  type: string
  title: string
  supervisor: string
  grade: string
  comments: string
  setting: string
  // derived
  mappedCategory: string
  issues: string[]
  selected: boolean
}

type Step = 1 | 2 | 3 | 4
type DuplicateHandling = 'skip' | 'import'
type ImportSpecialty = { key: string; name: string }

function findCol(headers: string[], candidates: string[]): string | null {
  const lower = headers.map(h => h.toLowerCase().trim())
  for (const c of candidates) {
    const idx = lower.indexOf(c)
    if (idx !== -1) return headers[idx]
  }
  return null
}

function mapType(raw: string): string {
  const t = raw.toLowerCase()
  if (t.includes('cbd') || t.includes('case-based')) return 'reflection'
  if (t.includes('mini-cex') || t.includes('minicex')) return 'reflection'
  if (t.includes('dop') || t.includes('directly observed')) return 'procedure'
  if (t.includes('acat') || t.includes('acute care')) return 'reflection'
  if (t.includes('teaching')) return 'teaching'
  if (t.includes('audit') || t.includes('qip')) return 'audit_qip'
  if (t.includes('publication')) return 'publication'
  return 'custom'
}

function categoryLabel(value: string) {
  return CATEGORIES.find(category => category.value === value)?.label ?? value
}

function parseRows(data: Record<string, string>[], headers: string[]): HorusRow[] {
  const colDate       = findCol(headers, COL_DATE)
  const colType       = findCol(headers, COL_TYPE)
  const colTitle      = findCol(headers, COL_TITLE)
  const colSupervisor = findCol(headers, COL_SUPERVISOR)
  const colGrade      = findCol(headers, COL_GRADE)
  const colComments   = findCol(headers, COL_COMMENTS)
  const colSetting    = findCol(headers, COL_SETTING)

  return data.map((row, i) => {
    const rawTitle = colTitle ? (row[colTitle] ?? '').trim() : ''
    const rawDate  = colDate  ? (row[colDate] ?? '').trim()  : ''
    const rawType  = colType  ? (row[colType] ?? '').trim()  : ''

    const issues: string[] = []
    if (!rawTitle) issues.push('Missing title - will be skipped')
    if (!rawDate)  issues.push('Missing date')
    if (!rawType)  issues.push('Missing type - will import as Custom')

    return {
      rawIndex:       i,
      date:           rawDate,
      type:           rawType,
      title:          rawTitle,
      supervisor:     colSupervisor ? (row[colSupervisor] ?? '').trim() : '',
      grade:          colGrade      ? (row[colGrade] ?? '').trim()      : '',
      comments:       colComments   ? (row[colComments] ?? '').trim()   : '',
      setting:        colSetting    ? (row[colSetting] ?? '').trim()    : '',
      mappedCategory: mapType(rawType),
      issues,
      selected:       true,
    }
  })
}

const HORUS_REQUIRED_COLS = [...COL_DATE, ...COL_TYPE, ...COL_TITLE]

function detectHorusFormat(headers: string[]): boolean {
  const lower = headers.map(h => h.toLowerCase().trim())
  // Need at least one match in each required column group
  const hasDate  = COL_DATE.some(c => lower.includes(c))
  const hasType  = COL_TYPE.some(c => lower.includes(c))
  const hasTitle = COL_TITLE.some(c => lower.includes(c))
  return hasDate && hasType && hasTitle
}

export default function HorusImportWizard({ specialtyOptions = [] }: { specialtyOptions?: ImportSpecialty[] }) {
  const [step, setStep] = useState<Step>(1)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<HorusRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [dupHandling, setDupHandling] = useState<DuplicateHandling>('skip')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(file: File) {
    setError(null)
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a .csv file exported from Horus or another official foundation portfolio.')
      return
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const hdrs = result.meta.fields ?? []
        if (!detectHorusFormat(hdrs)) {
          setError(`This does not look like a supported portfolio export. Expected columns including date, type, and title/subject. Found: ${hdrs.slice(0, 6).join(', ')}...`)
          return
        }
        const parsed = parseRows(result.data, hdrs)
        setHeaders(hdrs)
        setRows(parsed)
        setStep(2)
      },
      error: (err) => setError(`Failed to parse CSV: ${err.message}`),
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function toggleRow(idx: number) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r))
  }

  function toggleAll(val: boolean) {
    setRows(prev => prev.map(r => ({ ...r, selected: val })))
  }

  function toggleTag(key: string) {
    setSelectedTags(prev => prev.includes(key) ? prev.filter(tag => tag !== key) : [...prev, key])
  }

  async function handleImport() {
    setImporting(true)
    const toImport = rows.filter(r => r.selected && r.title)

    const res = await apiFetch<{ created: number; skipped: number; errors: { row: number; error: string }[]; error?: string }>('/api/import/horus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rows: toImport.map(r => ({
          date: r.date,
          type: r.type,
          title: r.title,
          category: r.mappedCategory,
          supervisor_name: r.supervisor,
          supervision_level: r.grade,
          notes: [r.comments, r.setting ? `Clinical setting: ${r.setting}` : ''].filter(Boolean).join('\n\n'),
          specialty_tags: selectedTags,
        })),
        dupHandling,
      }),
    })

    if (!res.ok || !res.data) {
      setError(res.status === null ? NETWORK_ERROR_MESSAGE : res.data?.error ?? 'Import failed')
      setImporting(false)
      return
    }

    setResult(res.data)
    setStep(4)
    setImporting(false)
  }

  // Count only rows that will actually import — selected AND with a title.
  // `handleImport` filters on `r.selected && r.title`, so a selected no-title
  // row must not inflate the "Configure import / Import N entries" labels. (F-042)
  const selectedCount  = rows.filter(r => r.selected && r.title).length
  const skippableCount = rows.filter(r => !r.title).length
  const warningCount   = rows.filter(r => r.issues.length > 0 && r.title).length

  return (
    <div className="max-w-3xl">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {([1, 2, 3, 4] as Step[]).map((s, idx) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step === s ? 'bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]'
              : step > s ? 'bg-emerald-500 text-[var(--text-inverse)]'
              : 'bg-white/[0.06] text-[var(--text-secondary)]'
            }`}>
              {step > s ? 'OK' : s}
            </div>
            <span className={`text-xs font-medium ${step === s ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
              {['Upload', 'Preview', 'Configure', 'Done'][idx]}
            </span>
            {idx < 3 && <div className="w-8 h-px bg-white/[0.08] mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">Upload your Horus export</h2>
            <p className="text-sm text-[var(--text-secondary)]">Built for doctors moving Horus evidence into Clerkfolio. CSV exports from other official foundation portfolio systems can also work if they include date, type, and title columns.</p>
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
              dragging ? 'border-[var(--accent)] bg-[#1B6FD9]/5' : 'border-white/[0.08] hover:border-white/[0.2]'
            }`}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Drop CSV here, or click to browse</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">.csv files only - Horus supervised learning event export preferred</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
            />
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <div className="bg-[var(--bg-surface)] border border-white/[0.06] rounded-xl p-4 text-xs text-[var(--text-muted)] space-y-1.5">
            <p className="font-medium text-[var(--text-secondary)]">How to export from Horus</p>
            <p>1. Log in to your Horus account at <span className="font-mono text-[var(--text-secondary)]">horus.hee.nhs.uk</span></p>
            <p>2. Navigate to Portfolio, then Supervised Learning Events or portfolio contents</p>
            <p>3. Use the export/download option and choose CSV where available</p>
            <p>4. Upload that file here</p>
            <p className="pt-2">Horus is the NHS England ePortfolio for foundation doctors in England. Clerkfolio imports your own export; it does not connect to Horus directly.</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a href="https://supporthorus.hee.nhs.uk/about-horus/what-is-horus/" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-text)] hover:text-[var(--accent-bright)]">Horus support</a>
              <a href="https://foundationprogramme.nhs.uk/curriculum/e-portfolio/" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-text)] hover:text-[var(--accent-bright)]">UKFPO e-portfolio guidance</a>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">Preview</h2>
              <p className="text-sm text-[var(--text-secondary)]">{rows.length} rows parsed - {skippableCount > 0 ? `${skippableCount} will be skipped (no title)` : 'All rows have titles'}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => toggleAll(true)} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Select all</button>
              <span className="text-[var(--text-secondary)]">-</span>
              <button onClick={() => toggleAll(false)} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">None</button>
            </div>
          </div>

          {warningCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-400/8 border border-amber-400/20 rounded-xl px-4 py-2.5 text-xs text-amber-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              {warningCount} row{warningCount !== 1 ? 's' : ''} with warnings (unrecognised type will import as Custom)
            </div>
          )}

          <div className="border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-[var(--bg-surface)] border-b border-white/[0.06] sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-medium text-[var(--text-muted)] w-10">
                      <input type="checkbox" checked={rows.every(r => r.selected)} onChange={e => toggleAll(e.target.checked)} className="accent-[var(--accent-text)]" />
                    </th>
                    <th className="px-3 py-2.5 text-left font-medium text-[var(--text-muted)]">Date</th>
                    <th className="px-3 py-2.5 text-left font-medium text-[var(--text-muted)]">Title</th>
                    <th className="px-3 py-2.5 text-left font-medium text-[var(--text-muted)]">Type / Category</th>
                    <th className="px-3 py-2.5 text-left font-medium text-[var(--text-muted)]">Supervisor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {rows.map((row, idx) => (
                    <tr key={idx} className={`${!row.title ? 'opacity-40' : ''} hover:bg-white/[0.02] transition-colors`}>
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          disabled={!row.title}
                          onChange={() => toggleRow(idx)}
                          className="accent-[var(--accent-text)]"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-[var(--text-secondary)] whitespace-nowrap font-mono">{row.date || '-'}</td>
                      <td className="px-3 py-2.5 text-[var(--text-primary)] max-w-[200px] truncate">
                        {row.title || <span className="italic text-[var(--text-secondary)]">no title</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[var(--text-muted)]">{row.type || '-'}</span>
                        {row.type && <span className="mx-1 text-[var(--text-secondary)]">/</span>}
                        <span className="text-[var(--text-secondary)]">{categoryLabel(row.mappedCategory)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-[var(--text-muted)] truncate max-w-[120px]">{row.supervisor || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between gap-3">
            <button onClick={() => setStep(1)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={selectedCount === 0}
              className="px-5 py-2.5 bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-40 text-[var(--button-primary-text)] font-semibold text-sm rounded-xl transition-colors"
            >
              Configure import ({selectedCount} rows)
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Configure */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">Configure import</h2>
            <p className="text-sm text-[var(--text-secondary)]">Set options that apply to all {selectedCount} selected entries.</p>
          </div>

          {/* Specialty tags */}
          <div className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-[var(--text-primary)]">Specialty tags</p>
            <p className="text-xs text-[var(--text-muted)]">Tag all imported entries with your tracked specialties so they show up in the specialty tracker. You can change this per-entry later.</p>
            {specialtyOptions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {specialtyOptions.map(option => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => toggleTag(option.key)}
                    className={`min-h-[36px] rounded-lg border px-3 text-xs font-medium ${selectedTags.includes(option.key) ? 'border-[var(--accent)] bg-[#1B6FD9]/15 text-[var(--text-primary)]' : 'border-white/[0.08] text-[var(--text-secondary)]'}`}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">Track a specialty first if you want these entries to appear in a specialty score tracker.</p>
            )}
          </div>

          {/* Duplicate handling */}
          <div className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-[var(--text-primary)]">Duplicate handling</p>
            <p className="text-xs text-[var(--text-muted)]">If an entry with the same title and date already exists in your portfolio:</p>
            <div className="space-y-2">
              {[
                { val: 'skip' as const, label: 'Skip duplicates', desc: 'Don\'t import rows that look like duplicates' },
                { val: 'import' as const, label: 'Import anyway', desc: 'Import all selected rows regardless' },
              ].map(opt => (
                <label key={opt.val} className="flex items-start gap-3 cursor-pointer">
                  <div
                    className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      dupHandling === opt.val ? 'border-[var(--accent)]' : 'border-white/[0.3]'
                    }`}
                    onClick={() => setDupHandling(opt.val)}
                  >
                    {dupHandling === opt.val && <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-primary)]">{opt.label}</p>
                    <p className="text-xs text-[var(--text-muted)]">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex justify-between gap-3">
            <button onClick={() => setStep(2)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-50 text-[var(--button-primary-text)] font-semibold text-sm rounded-xl transition-colors"
            >
              {importing ? (
                <>
                  <div className="w-4 h-4 border-2 border-[var(--bg-canvas)] border-t-[var(--bg-canvas)] rounded-full motion-safe:animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${selectedCount} entries`
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 4 && result && (
        <div className="space-y-6">
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--cat-green-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Import complete</h2>
            <div className="grid grid-cols-2 gap-6 mt-4">
              <div>
                <p className="text-3xl font-bold text-[var(--text-primary)]">{result.created}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Created</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[var(--text-muted)]">{result.skipped}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Skipped</p>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <Link
              href="/portfolio"
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] text-[var(--button-primary-text)] font-semibold text-sm rounded-xl transition-colors"
            >
              View portfolio
            </Link>
            <button
              onClick={() => { setStep(1); setRows([]); setResult(null); setError(null) }}
              className="px-5 py-2.5 border border-white/[0.08] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm rounded-xl transition-colors"
            >
              Import another file
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
