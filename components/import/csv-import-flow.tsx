'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { CATEGORIES, type Category } from '@/lib/types/portfolio'
import { useToast } from '@/components/ui/toast-provider'
import { formatSpecialtyLabel } from '@/lib/specialties'
import { apiFetch, NETWORK_ERROR_MESSAGE } from '@/lib/api-fetch'

type ImportTarget = 'portfolio' | 'cases'
type Step = 1 | 2 | 3 | 4
type PresetKey = 'horus' | 'microguide' | 'nhs_learn' | 'custom'
type FieldKey = 'title' | 'category' | 'date' | 'notes' | 'specialty_tags' | 'clinical_domain' | 'refl_free_text'

const CATEGORY_VALUES = new Set(CATEGORIES.map(c => c.value))

const FIELD_OPTIONS: Record<ImportTarget, { value: FieldKey; label: string; required?: boolean }[]> = {
  portfolio: [
    { value: 'title', label: 'Title', required: true },
    { value: 'category', label: 'Category' },
    { value: 'date', label: 'Date' },
    { value: 'notes', label: 'Notes' },
    { value: 'refl_free_text', label: 'Reflection text' },
    { value: 'specialty_tags', label: 'Specialty tags' },
  ],
  cases: [
    { value: 'title', label: 'Title', required: true },
    { value: 'date', label: 'Date' },
    { value: 'clinical_domain', label: 'Clinical domain' },
    { value: 'notes', label: 'Notes' },
    { value: 'specialty_tags', label: 'Specialty tags' },
  ],
}

const PRESETS: Record<PresetKey, {
  label: string
  target: ImportTarget
  defaultCategory?: Category
  candidates: Partial<Record<FieldKey, string[]>>
}> = {
  horus: {
    label: 'Horus',
    target: 'portfolio',
    defaultCategory: 'reflection',
    candidates: {
      title: ['title', 'subject', 'case / problem', 'case/problem', 'topic', 'summary'],
      category: ['category', 'type', 'assessment type', 'event type', 'activity type'],
      date: ['date', 'event date', 'completion date', 'signed date'],
      notes: ['comments', 'feedback', 'learning points', 'notes'],
      refl_free_text: ['reflection', 'reflective notes'],
      specialty_tags: ['specialty_tags', 'specialty', 'tags'],
    },
  },
  microguide: {
    label: 'MicroGuide',
    target: 'portfolio',
    defaultCategory: 'custom',
    candidates: {
      title: ['title', 'guideline', 'topic', 'activity', 'module'],
      date: ['date', 'completed_at', 'completion date'],
      notes: ['notes', 'reflection', 'learning points', 'description'],
      specialty_tags: ['specialty', 'tags'],
    },
  },
  nhs_learn: {
    label: 'NHS Learn',
    target: 'portfolio',
    defaultCategory: 'teaching',
    candidates: {
      title: ['course title', 'activity title', 'learning item', 'title'],
      date: ['completion date', 'date completed', 'completed', 'date'],
      notes: ['description', 'learning outcome', 'notes'],
      specialty_tags: ['specialty', 'tags'],
    },
  },
  custom: {
    label: 'Custom',
    target: 'portfolio',
    defaultCategory: 'custom',
    candidates: {
      title: ['title', 'name', 'summary'],
      category: ['category', 'type'],
      date: ['date'],
      notes: ['notes', 'description'],
      // Mirror the Horus preset so a typical spreadsheet export auto-maps its
      // Reflection / Specialty columns instead of leaving them "Not mapped". (F-041)
      refl_free_text: ['reflection', 'reflective notes'],
      clinical_domain: ['clinical_domain', 'clinical domain', 'domain'],
      specialty_tags: ['specialty_tags', 'specialty', 'specialties', 'specialty tags', 'tags'],
    },
  },
}

function normaliseHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function autoMap(headers: string[], preset: PresetKey, target: ImportTarget) {
  const lower = headers.map(normaliseHeader)
  const candidates = PRESETS[preset].candidates
  const next: Partial<Record<FieldKey, string>> = {}

  FIELD_OPTIONS[target].forEach(field => {
    const matches = candidates[field.value] ?? [field.value]
    const index = matches.map(normaliseHeader).map(candidate => lower.indexOf(candidate)).find(i => i >= 0)
    if (index !== undefined && index >= 0) next[field.value] = headers[index]
  })

  return next
}

function normaliseCategory(value: string | undefined, fallback: Category): Category {
  const cleaned = (value ?? '').trim().toLowerCase().replace(/\s+/g, '_')
  return CATEGORY_VALUES.has(cleaned as Category) ? cleaned as Category : fallback
}

function splitTags(value: string | undefined) {
  return (value ?? '').split(/[;,]/).map(v => v.trim()).filter(Boolean)
}

function categoryLabel(value: string) {
  return CATEGORIES.find(category => category.value === value)?.label ?? value
}

const PREVIEW_LABELS: Record<string, string> = {
  title: 'Title',
  category: 'Category',
  date: 'Date',
  notes: 'Notes',
  refl_free_text: 'Reflection text',
  specialty_tags: 'Linked specialties',
  clinical_domain: 'Clinical area',
}

function previewValue(key: string, value: unknown) {
  if (key === 'category' && typeof value === 'string') return categoryLabel(value)
  if (key === 'specialty_tags' && Array.isArray(value)) return value.map(tag => formatSpecialtyLabel(String(tag))).join('; ')
  if (Array.isArray(value)) return value.join('; ')
  return String(value ?? '')
}

function isoDate(value: string | undefined) {
  if (!value) return new Date().toISOString().split('T')[0]
  const dmy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  const iso = value.match(/^\d{4}-\d{2}-\d{2}$/)
  if (iso) return value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().split('T')[0] : parsed.toISOString().split('T')[0]
}

export default function CsvImportFlow() {
  const router = useRouter()
  const { addToast } = useToast()
  const [step, setStep] = useState<Step>(1)
  const [target, setTarget] = useState<ImportTarget>('portfolio')
  const [preset, setPreset] = useState<PresetKey>('custom')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Partial<Record<FieldKey, string>>>({})
  const [importing, setImporting] = useState(false)

  function applyPreset(nextPreset: PresetKey, nextTarget = PRESETS[nextPreset].target) {
    setPreset(nextPreset)
    setTarget(nextTarget)
    setMapping(autoMap(headers, nextPreset, nextTarget))
  }

  function handleFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: result => {
        const nextHeaders = result.meta.fields ?? []
        setHeaders(nextHeaders)
        setRows(result.data)
        const detectedPreset: PresetKey = nextHeaders.some(h => /supervisor|assessor|mini-cex|cbd/i.test(h)) ? 'horus' : preset
        setPreset(detectedPreset)
        setTarget(PRESETS[detectedPreset].target)
        setMapping(autoMap(nextHeaders, detectedPreset, PRESETS[detectedPreset].target))
        setStep(2)
      },
      error: err => addToast(`Failed to parse CSV: ${err.message}`, 'error'),
    })
  }

  const preview = rows.slice(0, 10).map(row => {
    const get = (field: FieldKey) => mapping[field] ? row[mapping[field]!] : ''
    if (target === 'portfolio') {
      return {
        title: get('title'),
        category: normaliseCategory(get('category'), PRESETS[preset].defaultCategory ?? 'custom'),
        date: isoDate(get('date')),
        notes: get('notes'),
        refl_free_text: get('refl_free_text'),
        specialty_tags: splitTags(get('specialty_tags')),
      }
    }
    return {
      title: get('title'),
      date: isoDate(get('date')),
      clinical_domain: get('clinical_domain'),
      notes: get('notes'),
      specialty_tags: splitTags(get('specialty_tags')),
    }
  })

  async function importRows() {
    if (!mapping.title) {
      addToast('Map a title column before importing.', 'error')
      setStep(2)
      return
    }

    setImporting(true)

    const getValue = (row: Record<string, string>, field: FieldKey) => mapping[field] ? row[mapping[field]!] : ''
    const payloadRows = rows
      .filter(row => getValue(row, 'title')?.trim())
      .map(row => {
        if (target === 'portfolio') {
          return {
            title: getValue(row, 'title').trim(),
            category: normaliseCategory(getValue(row, 'category'), PRESETS[preset].defaultCategory ?? 'custom'),
            date: isoDate(getValue(row, 'date')),
            notes: getValue(row, 'notes') || null,
            refl_free_text: getValue(row, 'refl_free_text') || null,
            specialty_tags: splitTags(getValue(row, 'specialty_tags')),
            interview_themes: [],
          }
        }
        return {
          title: getValue(row, 'title').trim(),
          date: isoDate(getValue(row, 'date')),
          clinical_domain: getValue(row, 'clinical_domain') || null,
          clinical_domains: getValue(row, 'clinical_domain') ? [getValue(row, 'clinical_domain')] : [],
          notes: getValue(row, 'notes') || null,
          specialty_tags: splitTags(getValue(row, 'specialty_tags')),
          interview_themes: [],
        }
      })

    // Route through the server so the entitlement gate and rate limit apply
    // identically to CSV and JSON imports.
    const { ok, status, data: result } = await apiFetch<{ error?: string; imported?: number; skipped?: number }>('/api/import/csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, rows: payloadRows }),
    })
    setImporting(false)

    if (!ok) {
      addToast(status === null ? NETWORK_ERROR_MESSAGE : (result?.error ?? 'Import failed. Check the column mapping and try again.'), 'error')
      return
    }
    const imported = Number(result?.imported ?? 0)
    const skipped = Number(result?.skipped ?? 0)
    const label = target === 'portfolio' ? 'portfolio entries' : 'cases'
    if (skipped > 0) {
      addToast(`Imported ${imported} ${label} — ${skipped} row${skipped === 1 ? '' : 's'} skipped (missing title or invalid category)`, 'info')
    } else {
      addToast(`Imported ${imported} ${label}`, 'success')
    }
    setStep(4)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {([1, 2, 3, 4] as Step[]).map(s => (
          <span key={s} className={`rounded-full px-3 py-1 text-xs font-medium ${step === s ? 'bg-[#1B6FD9] text-white' : step > s ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.06] text-[rgba(245,245,242,0.55)]'}`}>
            {s === 1 ? 'Upload' : s === 2 ? 'Map' : s === 3 ? 'Preview' : 'Done'}
          </span>
        ))}
      </div>

      {step === 1 && (
        <section className="rounded-2xl border border-white/[0.08] bg-[#141416] p-6">
          <label className="block text-xs font-medium uppercase tracking-wide text-[rgba(245,245,242,0.55)]">
            CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="mt-3 block w-full text-sm text-[rgba(245,245,242,0.65)] file:min-h-[44px] file:mr-4 file:rounded-lg file:border-0 file:bg-[#1B6FD9] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
          </label>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-2xl border border-white/[0.08] bg-[#141416] p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium uppercase tracking-wide text-[rgba(245,245,242,0.55)]">
              Preset
              <select value={preset} onChange={e => applyPreset(e.target.value as PresetKey)} className="mt-2 w-full min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3 text-sm text-[#F5F5F2]">
                {Object.entries(PRESETS).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium uppercase tracking-wide text-[rgba(245,245,242,0.55)]">
              Import as
              <select value={target} onChange={e => { const next = e.target.value as ImportTarget; setTarget(next); setMapping(autoMap(headers, preset, next)) }} className="mt-2 w-full min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3 text-sm text-[#F5F5F2]">
                <option value="portfolio">Portfolio entries</option>
                <option value="cases">Cases</option>
              </select>
            </label>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {FIELD_OPTIONS[target].map(field => (
              <label key={field.value} className="text-xs font-medium uppercase tracking-wide text-[rgba(245,245,242,0.55)]">
                {field.label}{field.required ? ' *' : ''}
                <select
                  value={mapping[field.value] ?? ''}
                  onChange={e => setMapping(current => ({ ...current, [field.value]: e.target.value || undefined }))}
                  className="mt-2 w-full min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3 text-sm text-[#F5F5F2]"
                >
                  <option value="">Not mapped</option>
                  {headers.map(header => <option key={header} value={header}>{header}</option>)}
                </select>
              </label>
            ))}
          </div>
          <button onClick={() => setStep(3)} className="mt-6 min-h-[44px] rounded-xl bg-[#1B6FD9] px-5 text-sm font-semibold text-white">Preview rows</button>
        </section>
      )}

      {step === 3 && (
        <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141416]">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <p className="text-sm font-semibold text-[#F5F5F2]">{rows.length} rows parsed</p>
          </div>
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0B0C] text-[rgba(245,245,242,0.45)]">
                <tr>
                  {Object.keys(preview[0] ?? { title: '', date: '' }).map(key => <th key={key} className="px-4 py-3 font-medium">{PREVIEW_LABELS[key] ?? key}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-[rgba(245,245,242,0.72)]">
                {preview.map((row, index) => (
                  <tr key={index}>
                    {Object.entries(row).map(([key, value]) => (
                      <td key={key} className="max-w-56 truncate px-4 py-3">{previewValue(key, value)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2 p-5">
            <button onClick={() => setStep(2)} className="min-h-[44px] rounded-xl border border-white/[0.08] px-5 text-sm font-medium text-[#F5F5F2]">Back</button>
            <button onClick={importRows} disabled={importing} className="min-h-[44px] rounded-xl bg-[#1B6FD9] px-5 text-sm font-semibold text-white disabled:opacity-50">
              {importing ? 'Importing...' : 'Commit import'}
            </button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6">
          <p className="text-sm font-semibold text-emerald-200">Import complete</p>
          <button onClick={() => router.push(target === 'portfolio' ? '/portfolio' : '/cases')} className="mt-4 min-h-[44px] rounded-xl bg-[#1B6FD9] px-5 text-sm font-semibold text-white">
            Open imported records
          </button>
        </section>
      )}
    </div>
  )
}
