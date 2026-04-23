'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type PortfolioCategory =
  | 'audit_qip'
  | 'teaching'
  | 'conference'
  | 'publication'
  | 'leadership'
  | 'prize'
  | 'procedure'
  | 'reflection'
  | 'custom'

const VALID_CATEGORIES: PortfolioCategory[] = [
  'audit_qip', 'teaching', 'conference', 'publication',
  'leadership', 'prize', 'procedure', 'reflection', 'custom',
]

const IMPORTABLE_FIELDS = ['title', 'category', 'date', 'notes', 'specialty_tags'] as const
type ImportField = typeof IMPORTABLE_FIELDS[number]

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split('\n').filter(l => l.trim())
  for (const line of lines) {
    const cells: string[] = []
    let cur = '', inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { cells.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    cells.push(cur.trim())
    rows.push(cells)
  }
  return rows
}

function normaliseCategory(val: string): PortfolioCategory {
  const lower = val.toLowerCase().replace(/[\s-]/g, '_')
  if ((VALID_CATEGORIES as string[]).includes(lower)) return lower as PortfolioCategory
  return 'custom'
}

function normaliseDate(val: string): string {
  if (!val) return new Date().toISOString().split('T')[0]
  const d = new Date(val)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return new Date().toISOString().split('T')[0]
}

export default function ImportForm() {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Partial<Record<ImportField, string>>>({})
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState<number | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setDone(null)
    setErrors([])
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length < 2) return
      const [headerRow, ...dataRows] = parsed
      setHeaders(headerRow)
      setRows(dataRows)
      // Auto-map columns by header name
      const autoMap: Partial<Record<ImportField, string>> = {}
      for (const field of IMPORTABLE_FIELDS) {
        const match = headerRow.find(h => h.toLowerCase().replace(/[\s_-]/g, '') === field.replace(/_/g, ''))
        if (match) autoMap[field] = match
      }
      setMapping(autoMap)
    }
    reader.readAsText(file)
  }, [])

  function getCellValue(row: string[], colHeader: string): string {
    const idx = headers.indexOf(colHeader)
    return idx >= 0 ? (row[idx] ?? '') : ''
  }

  async function handleImport() {
    if (!mapping.title) return
    setImporting(true)
    setProgress(0)
    setDone(null)
    setErrors([])

    const errs: string[] = []
    let successCount = 0

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setErrors(['Not authenticated']); setImporting(false); return }

    // Build all records first, collecting row-level validation errors
    type EntryRecord = {
      user_id: string
      title: string
      category: PortfolioCategory
      date: string
      notes: string | null
      specialty_tags: string[]
    }
    const validRecords: Array<{ record: EntryRecord; rowIndex: number }> = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const title = getCellValue(row, mapping.title!)
      if (!title) { errs.push(`Row ${i + 2}: missing title`); continue }

      const category = mapping.category
        ? normaliseCategory(getCellValue(row, mapping.category))
        : 'custom'

      const date = mapping.date
        ? normaliseDate(getCellValue(row, mapping.date))
        : new Date().toISOString().split('T')[0]

      const notes = mapping.notes ? getCellValue(row, mapping.notes) : null

      const specialtyTagsRaw = mapping.specialty_tags ? getCellValue(row, mapping.specialty_tags) : ''
      const specialty_tags = specialtyTagsRaw
        ? specialtyTagsRaw.split(';').map(t => t.trim()).filter(Boolean)
        : []

      validRecords.push({
        record: { user_id: user.id, title, category, date, notes: notes || null, specialty_tags },
        rowIndex: i,
      })
    }

    // Batch insert in chunks of 100 to avoid N+1 query overhead
    const CHUNK_SIZE = 100
    for (let c = 0; c < validRecords.length; c += CHUNK_SIZE) {
      const chunk = validRecords.slice(c, c + CHUNK_SIZE)
      const { error } = await supabase
        .from('portfolio_entries')
        .insert(chunk.map(r => r.record))

      if (error) {
        // On batch error, record which rows were affected
        chunk.forEach(r => errs.push(`Row ${r.rowIndex + 2}: ${error.message}`))
      } else {
        successCount += chunk.length
      }

      setProgress(Math.round(((c + Math.min(CHUNK_SIZE, validRecords.length - c)) / validRecords.length) * 100))
    }

    setImporting(false)
    setDone(successCount)
    setErrors(errs)
  }

  const previewRows = rows.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* File upload */}
      <div className="bg-[#141416] border border-white/[0.07] rounded-xl p-6">
        <h2 className="text-sm font-medium text-[#F5F5F2] mb-3">Select CSV file</h2>
        <p className="text-xs text-[rgba(245,245,242,0.4)] mb-4">
          The first row should be column headers. Required column: <span className="text-[rgba(245,245,242,0.7)] font-medium">title</span>.
        </p>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.07] text-sm text-[rgba(245,245,242,0.7)] transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {fileName ? fileName : 'Choose file…'}
        </button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      </div>

      {/* Column mapping */}
      {headers.length > 0 && (
        <div className="bg-[#141416] border border-white/[0.07] rounded-xl p-6">
          <h2 className="text-sm font-medium text-[#F5F5F2] mb-4">Map columns</h2>
          <div className="space-y-3">
            {IMPORTABLE_FIELDS.map(field => (
              <div key={field} className="flex items-center gap-4">
                <label className="text-xs font-medium text-[rgba(245,245,242,0.55)] w-32 flex-shrink-0 capitalize">
                  {field.replace(/_/g, ' ')}
                  {field === 'title' && <span className="text-[#1D9E75] ml-1">*</span>}
                </label>
                <select
                  value={mapping[field] ?? ''}
                  onChange={e => setMapping(m => ({ ...m, [field]: e.target.value || undefined }))}
                  className="flex-1 bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1D9E75] transition-colors"
                >
                  <option value="">— not mapped —</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {previewRows.length > 0 && (
        <div className="bg-[#141416] border border-white/[0.07] rounded-xl p-6">
          <h2 className="text-sm font-medium text-[#F5F5F2] mb-4">
            Preview <span className="text-[rgba(245,245,242,0.4)] font-normal">(first {previewRows.length} of {rows.length} rows)</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {headers.map(h => (
                    <th key={h} className="text-left pb-2 pr-4 text-[rgba(245,245,242,0.4)] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    {row.map((cell, j) => (
                      <td key={j} className="py-1.5 pr-4 text-[rgba(245,245,242,0.65)] max-w-[200px] truncate">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import button + progress */}
      {rows.length > 0 && (
        <div className="space-y-3">
          {importing && (
            <div className="space-y-2">
              <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-[#1D9E75] rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-[rgba(245,245,242,0.4)]">Importing… {progress}%</p>
            </div>
          )}

          {done !== null && (
            <div className="flex items-center gap-2.5 px-4 py-3 bg-[#1D9E75]/10 border border-[#1D9E75]/20 rounded-xl">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <p className="text-sm text-[#1D9E75] font-medium">{done} {done === 1 ? 'entry' : 'entries'} imported successfully.</p>
            </div>
          )}

          {errors.length > 0 && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-xs font-medium text-red-400 mb-1">{errors.length} {errors.length === 1 ? 'error' : 'errors'}:</p>
              <ul className="space-y-0.5">
                {errors.slice(0, 5).map((err, i) => (
                  <li key={i} className="text-xs text-red-300/80">{err}</li>
                ))}
                {errors.length > 5 && <li className="text-xs text-red-300/60">…and {errors.length - 5} more</li>}
              </ul>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={importing || !mapping.title}
            className="w-full bg-[#1D9E75] hover:bg-[#178060] disabled:opacity-50 disabled:cursor-not-allowed text-[#0B0B0C] font-semibold rounded-xl py-2.5 text-sm transition-colors"
          >
            {importing ? 'Importing…' : `Import ${rows.length} ${rows.length === 1 ? 'row' : 'rows'}`}
          </button>
        </div>
      )}
    </div>
  )
}
