'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, type Category } from '@/lib/types/portfolio'
import { useToast } from '@/components/ui/toast-provider'

type ImportTarget = 'portfolio' | 'cases'

const TARGETS: { value: ImportTarget; label: string; description: string }[] = [
  { value: 'portfolio', label: 'Portfolio entries', description: 'Achievements, reflections, teaching, audits, publications, and custom evidence.' },
  { value: 'cases', label: 'Cases', description: 'Anonymised clinical case notes only.' },
]

const REQUIRED_HEADERS: Record<ImportTarget, string[]> = {
  portfolio: ['title'],
  cases: ['title'],
}

const TEMPLATE_ROWS: Record<ImportTarget, string[][]> = {
  portfolio: [
    ['title', 'category', 'date', 'notes', 'specialty_tags'],
    ['Presented QIP at governance meeting', 'audit_qip', '2026-03-12', 'Reduced missed VTE assessments after a checklist intervention.', 'imt_2026;cst_2026'],
  ],
  cases: [
    ['title', 'date', 'clinical_domain', 'notes', 'specialty_tags'],
    ['Acute abdomen clerking', '2026-04-01', 'General Surgery', 'Anonymised reflection on assessment, escalation, and safety-netting.', 'cst_2026'],
  ],
}

const CATEGORY_VALUES: Set<string> = new Set(CATEGORIES.map(c => c.value))

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]
    if (char === '"' && quoted && next === '"') {
      cell += '"'
      i++
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(cell.trim())
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i++
      row.push(cell.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

function normaliseCategory(value: string): Category {
  const cleaned = value.trim().toLowerCase().replace(/\s+/g, '_')
  return CATEGORY_VALUES.has(cleaned) ? cleaned as Category : 'custom'
}

function splitTags(value: string | undefined) {
  return (value ?? '').split(/[;,]/).map(v => v.trim()).filter(Boolean)
}

export default function CsvImportFlow() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const { addToast } = useToast()
  const [target, setTarget] = useState<ImportTarget>('portfolio')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [importing, setImporting] = useState(false)

  async function handleFile(file: File) {
    const text = await file.text()
    const parsed = parseCSV(text)
    const nextHeaders = (parsed[0] ?? []).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
    const nextRows = parsed.slice(1).map(row => Object.fromEntries(nextHeaders.map((header, index) => [header, row[index] ?? ''])))
    setHeaders(nextHeaders)
    setRows(nextRows)
  }

  async function importRows() {
    const missing = REQUIRED_HEADERS[target].filter(header => !headers.includes(header))
    if (missing.length > 0) {
      addToast(`Missing required header: ${missing.join(', ')}`, 'error')
      return
    }

    setImporting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setImporting(false)
      return
    }

    const payload = rows.map(row => {
      if (target === 'portfolio') {
        return {
          user_id: user.id,
          title: row.title,
          category: normaliseCategory(row.category ?? ''),
          date: row.date || new Date().toISOString().split('T')[0],
          notes: row.notes ?? '',
          specialty_tags: splitTags(row.specialty_tags),
          interview_themes: [],
        }
      }
      return {
        user_id: user.id,
        title: row.title,
        date: row.date || new Date().toISOString().split('T')[0],
        clinical_domain: row.clinical_domain ?? '',
        notes: row.notes ?? '',
        specialty_tags: splitTags(row.specialty_tags),
        interview_themes: [],
      }
    })

    const { error } = await supabase.from(target === 'portfolio' ? 'portfolio_entries' : 'cases').insert(payload)
    setImporting(false)
    if (error) {
      addToast('Import failed. Check the CSV format and try again.', 'error')
      return
    }
    addToast(`Imported ${payload.length} ${target === 'portfolio' ? 'portfolio entries' : 'cases'}`, 'success')
    router.push(target === 'portfolio' ? '/portfolio' : '/cases')
  }

  const template = TEMPLATE_ROWS[target].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TARGETS.map(item => (
          <button
            key={item.value}
            onClick={() => { setTarget(item.value); setHeaders([]); setRows([]) }}
            className={`min-h-[44px] text-left rounded-xl border p-4 ${target === item.value ? 'border-[#1B6FD9] bg-[#1B6FD9]/10' : 'border-white/[0.08] bg-[#141416]'}`}
          >
            <p className="text-sm font-semibold text-[#F5F5F2]">{item.label}</p>
            <p className="text-xs text-[rgba(245,245,242,0.45)] mt-1">{item.description}</p>
          </button>
        ))}
      </div>

      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5">
        <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] uppercase tracking-wide mb-2">CSV file</label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="block w-full text-sm text-[rgba(245,245,242,0.65)] file:min-h-[44px] file:mr-4 file:rounded-lg file:border-0 file:bg-[#1B6FD9] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#0B0B0C]"
        />
      </div>

      <details className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5">
        <summary className="cursor-pointer text-sm font-medium text-[#F5F5F2]">Template CSV</summary>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-[#0B0B0C] p-4 text-xs text-[rgba(245,245,242,0.65)]">{template}</pre>
      </details>

      {rows.length > 0 && (
        <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#F5F5F2]">{rows.length} rows ready</p>
              <p className="text-xs text-[rgba(245,245,242,0.4)]">Headers: {headers.join(', ')}</p>
            </div>
            <button onClick={importRows} disabled={importing} className="min-h-[44px] bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-50 text-[#0B0B0C] font-semibold rounded-lg px-5 py-2.5 text-sm">
              {importing ? 'Importing...' : 'Import rows'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
