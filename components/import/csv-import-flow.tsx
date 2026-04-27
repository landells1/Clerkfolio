'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, type Category } from '@/lib/types/portfolio'
import { LOGBOOK_ROLES, LOGBOOK_SUPERVISION, type LogbookRole, type LogbookSupervision } from '@/lib/types/logbook'
import { SPECIALTY_CONFIGS } from '@/lib/specialties'
import { useToast } from '@/components/ui/toast-provider'

type ImportTarget = 'portfolio' | 'cases' | 'logbook'

type FieldConfig = {
  key: string
  label: string
  required?: boolean
  aliases: string[]
  help?: string
}

type ParsedFile = {
  headers: string[]
  rows: string[][]
}

const TARGETS: { value: ImportTarget; label: string; description: string }[] = [
  { value: 'portfolio', label: 'Portfolio entries', description: 'Achievements, reflections, teaching, audits, publications, and custom evidence.' },
  { value: 'cases', label: 'Cases', description: 'Anonymised clinical case log entries.' },
  { value: 'logbook', label: 'Operative logbook', description: 'Anonymised personal operative reflection records.' },
]

const FIELD_CONFIGS: Record<ImportTarget, FieldConfig[]> = {
  portfolio: [
    { key: 'title', label: 'Title', required: true, aliases: ['title', 'name', 'entry', 'achievement'] },
    { key: 'category', label: 'Category', aliases: ['category', 'type', 'entry type'] },
    { key: 'date', label: 'Date', aliases: ['date', 'completed date', 'entry date'] },
    { key: 'notes', label: 'Notes', aliases: ['notes', 'description', 'reflection', 'details'] },
    { key: 'specialty_tags', label: 'Application tags', aliases: ['specialty tags', 'specialties', 'application tags', 'tags'], help: 'Separate multiple tags with semicolons.' },
  ],
  cases: [
    { key: 'title', label: 'Case title', required: true, aliases: ['title', 'case', 'case title', 'presentation'] },
    { key: 'date', label: 'Date', aliases: ['date', 'seen date', 'case date'] },
    { key: 'clinical_domains', label: 'Clinical areas', aliases: ['clinical domains', 'clinical areas', 'clinical area', 'domain', 'specialty'] },
    { key: 'notes', label: 'Notes', aliases: ['notes', 'learning', 'reflection', 'details'] },
    { key: 'specialty_tags', label: 'Application tags', aliases: ['specialty tags', 'specialties', 'application tags', 'tags'], help: 'Separate multiple tags with semicolons.' },
  ],
  logbook: [
    { key: 'procedure_name', label: 'Procedure', required: true, aliases: ['procedure', 'procedure name', 'operation', 'operation name'] },
    { key: 'surgical_specialty', label: 'Surgical specialty', required: true, aliases: ['surgical specialty', 'specialty', 'department'] },
    { key: 'date', label: 'Date', aliases: ['date', 'procedure date', 'operation date'] },
    { key: 'role', label: 'Role', aliases: ['role', 'your role', 'position'] },
    { key: 'supervision', label: 'Supervision', aliases: ['supervision', 'supervision level'] },
    { key: 'supervisor_name', label: 'Supervisor name', aliases: ['supervisor', 'supervisor name', 'trainer'] },
    { key: 'learning_points', label: 'Learning points', aliases: ['learning points', 'learning', 'reflection', 'notes'] },
    { key: 'specialty_tags', label: 'Application tags', aliases: ['specialty tags', 'specialties', 'application tags', 'tags'], help: 'Separate multiple tags with semicolons.' },
  ],
}

const INPUT = 'w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9] transition-colors'

const TEMPLATE_ROWS: Record<ImportTarget, string[][]> = {
  portfolio: [
    ['title', 'category', 'date', 'notes', 'application tags'],
    ['Presented QIP at local governance meeting', 'QIP', '2026-03-12', 'Reduced missed VTE assessments after checklist intervention.', 'IMT 2026; GP ST1 2026'],
    ['Small-group bedside teaching for medical students', 'Teaching', '2026-02-05', 'Abdominal examination teaching for Year 4 students.', 'Core Surgical Training 2026'],
    ['Regional poster presentation', 'Conference', '18/01/2026', 'Poster presentation on antimicrobial stewardship.', 'IMT 2026'],
  ],
  cases: [
    ['case title', 'date', 'clinical areas', 'notes', 'application tags'],
    ['Acute abdomen clerking', '2026-04-01', 'General Surgery; Emergency Medicine', 'Anonymised reflection on assessment, escalation, and safety-netting.', 'cst_2026;accs_em_2026'],
    ['Paediatric wheeze', '20/03/2026', 'Paediatrics; Emergency Medicine', 'Learning around severity assessment and discharge advice.', 'paediatrics_st1_2026'],
  ],
  logbook: [
    ['procedure', 'surgical specialty', 'date', 'role', 'supervision', 'supervisor', 'learning points', 'application tags'],
    ['Laparoscopic appendicectomy', 'General Surgery', '2026-03-14', 'First Assist', 'Supervised', 'Mr Smith', 'Port placement, camera handling, and safe dissection planes.', 'cst_2026;general_surgery_st3_2026'],
    ['Flexible cystoscopy', 'Urology', '22/02/2026', 'Watched', 'Observed', '', 'Reviewed indications, consent, and documentation standards.', ''],
  ],
}

const CATEGORY_VARIANTS: Record<string, Category> = {
  audit: 'audit_qip',
  qip: 'audit_qip',
  qualityimprovement: 'audit_qip',
  qualityimprovementproject: 'audit_qip',
  teaching: 'teaching',
  presentation: 'teaching',
  presentations: 'teaching',
  conference: 'conference',
  course: 'conference',
  courses: 'conference',
  publication: 'publication',
  research: 'publication',
  paper: 'publication',
  poster: 'conference',
  leadership: 'leadership',
  management: 'leadership',
  society: 'leadership',
  prize: 'prize',
  award: 'prize',
  awards: 'prize',
  procedure: 'procedure',
  procedures: 'procedure',
  skill: 'procedure',
  skills: 'procedure',
  reflection: 'reflection',
  cbd: 'reflection',
  cex: 'reflection',
  minicex: 'reflection',
  dops: 'reflection',
  custom: 'custom',
  other: 'custom',
}

const ROLE_VARIANTS: Record<string, LogbookRole> = {
  surgeon: 'Surgeon',
  primaryoperator: 'Surgeon',
  operator: 'Surgeon',
  performed: 'Surgeon',
  did: 'Surgeon',
  assisted: 'First Assist',
  assist: 'First Assist',
  assistant: 'First Assist',
  firstassist: 'First Assist',
  firstassistant: 'First Assist',
  secondassist: 'Second Assist',
  secondassistant: 'Second Assist',
  scrubbed: 'Scrubbed',
  scrub: 'Scrubbed',
  observed: 'Observed',
  observer: 'Observed',
  watched: 'Observed',
  watch: 'Observed',
  saw: 'Observed',
  viewing: 'Observed',
  present: 'Observed',
}

const SUPERVISION_VARIANTS: Record<string, LogbookSupervision | null> = {
  independent: 'Independent',
  unsupervised: 'Independent',
  solo: 'Independent',
  supervised: 'Supervised',
  available: 'Supervised',
  supervisoravailable: 'Supervised',
  assisted: 'Assisted',
  helpavailable: 'Assisted',
  whenneeded: 'Assisted',
  directed: 'Directed',
  talkedthrough: 'Directed',
  throughout: 'Directed',
  observed: 'Observed',
  watched: 'Observed',
  watch: 'Observed',
  none: null,
  na: null,
  notspecified: null,
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0

  while (i < text.length) {
    const row: string[] = []
    while (i < text.length) {
      let cell = ''
      if (text[i] === '"') {
        i++
        while (i < text.length) {
          if (text[i] === '"') {
            if (text[i + 1] === '"') {
              cell += '"'
              i += 2
            } else {
              i++
              break
            }
          } else {
            cell += text[i++]
          }
        }
        while (i < text.length && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') i++
      } else {
        while (i < text.length && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') cell += text[i++]
      }

      row.push(cell.trim())
      if (i >= text.length || text[i] === '\n' || text[i] === '\r') break
      i++
    }

    if (text[i] === '\r') i++
    if (text[i] === '\n') i++
    if (row.some(cell => cell.trim())) rows.push(row)
  }

  return rows
}

function normaliseHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function splitList(value: string) {
  return value.split(/[;,]/).map(item => item.trim()).filter(Boolean)
}

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function rowsToCSV(rows: string[][]) {
  return rows.map(row => row.map(csvEscape).join(',')).join('\r\n')
}

function downloadTemplate(target: ImportTarget) {
  const csv = rowsToCSV(TEMPLATE_ROWS[target])
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `clinidex-${target}-template.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function normaliseDate(value: string) {
  if (!value.trim()) return new Date().toISOString().slice(0, 10)
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)

  const uk = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (uk) {
    const [, day, month, rawYear] = uk
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`)
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10)
  }

  return new Date().toISOString().slice(0, 10)
}

function normaliseCategory(value: string): Category {
  const compact = value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  const byValue = CATEGORIES.find(category => category.value === compact)
  if (byValue) return byValue.value

  const byLabel = CATEGORIES.find(category =>
    [category.label, category.short].some(label => normaliseHeader(label) === normaliseHeader(value))
  )
  return byLabel?.value ?? CATEGORY_VARIANTS[normaliseHeader(value)] ?? 'custom'
}

function normaliseRole(value: string): { value: LogbookRole; matched: boolean } {
  if (!value.trim()) return { value: 'Observed', matched: true }
  const compact = normaliseHeader(value)
  const role = LOGBOOK_ROLES.find(option =>
    normaliseHeader(option.value) === compact || normaliseHeader(option.label) === compact
  )
  const mapped = role?.value ?? ROLE_VARIANTS[compact]
  return { value: mapped ?? 'Observed', matched: !!mapped }
}

function normaliseSupervision(value: string): { value: LogbookSupervision | null; matched: boolean } {
  if (!value.trim()) return { value: null, matched: true }
  const compact = normaliseHeader(value)
  const match = LOGBOOK_SUPERVISION.find(option =>
    normaliseHeader(option.value) === compact || normaliseHeader(option.label) === compact
  )
  if (match) return { value: match.value, matched: true }
  if (compact in SUPERVISION_VARIANTS) return { value: SUPERVISION_VARIANTS[compact], matched: true }
  return { value: null, matched: false }
}

function normaliseSpecialtyTags(value: string) {
  return splitList(value).map(tag => {
    const compact = normaliseHeader(tag)
    const match = SPECIALTY_CONFIGS.find(config =>
      normaliseHeader(config.key) === compact ||
      normaliseHeader(config.name) === compact
    )
    return match?.key ?? tag
  })
}

function hasPatientIdentifier(value: string) {
  const lower = value.toLowerCase()
  return (
    /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/.test(value) ||
    /\b(dob|date of birth|nhs number|hospital number|mrn|patient id)\b/.test(lower)
  )
}

export default function CsvImportFlow() {
  const supabase = createClient()
  const router = useRouter()
  const { addToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [target, setTarget] = useState<ImportTarget>('portfolio')
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ParsedFile | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState<number | null>(null)

  const fields = FIELD_CONFIGS[target]

  const requiredMapped = fields.every(field => !field.required || mapping[field.key])

  const previewRows = useMemo(() => parsed?.rows.slice(0, 5) ?? [], [parsed])

  function resetResults() {
    setErrors([])
    setWarnings([])
    setDone(null)
    setProgress(0)
  }

  function buildAutoMapping(headers: string[], nextTarget: ImportTarget) {
    const next: Record<string, string> = {}
    for (const field of FIELD_CONFIGS[nextTarget]) {
      const aliases = [field.key, ...field.aliases].map(normaliseHeader)
      const match = headers.find(header => aliases.includes(normaliseHeader(header)))
      if (match) next[field.key] = match
    }
    return next
  }

  const handleFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    resetResults()

    const reader = new FileReader()
    reader.onload = e => {
      const rows = parseCSV(String(e.target?.result ?? ''))
      if (rows.length < 2) {
        setParsed(null)
        setErrors(['CSV needs a header row and at least one data row.'])
        return
      }

      const [headers, ...dataRows] = rows
      setParsed({ headers, rows: dataRows })
      setMapping(buildAutoMapping(headers, target))
    }
    reader.readAsText(file)
  }, [target])

  function readCell(row: string[], header?: string) {
    if (!parsed || !header) return ''
    const index = parsed.headers.indexOf(header)
    return index >= 0 ? row[index] ?? '' : ''
  }

  function buildRecords(userId: string) {
    if (!parsed) return { records: [] as object[], rowErrors: [] as string[], rowWarnings: [] as string[] }

    const rowErrors: string[] = []
    const rowWarnings: string[] = []
    const records: object[] = []

    parsed.rows.forEach((row, index) => {
      const rowNumber = index + 2

      if (target === 'portfolio') {
        const title = readCell(row, mapping.title).trim()
        if (!title) {
          rowErrors.push(`Row ${rowNumber}: missing title.`)
          return
        }

        const rawCategory = readCell(row, mapping.category)
        const category = rawCategory ? normaliseCategory(rawCategory) : 'custom'
        if (rawCategory && category === 'custom' && normaliseHeader(rawCategory) !== 'custom') {
          rowWarnings.push(`Row ${rowNumber}: category "${rawCategory}" imported as custom.`)
        }

        records.push({
          user_id: userId,
          title: title.slice(0, 200),
          category,
          date: normaliseDate(readCell(row, mapping.date)),
          notes: readCell(row, mapping.notes).trim() || null,
          specialty_tags: normaliseSpecialtyTags(readCell(row, mapping.specialty_tags)),
        })
        return
      }

      if (target === 'cases') {
        const title = readCell(row, mapping.title).trim()
        const notes = readCell(row, mapping.notes).trim()
        if (!title) {
          rowErrors.push(`Row ${rowNumber}: missing case title.`)
          return
        }
        if (hasPatientIdentifier(`${title} ${notes}`)) {
          rowErrors.push(`Row ${rowNumber}: possible patient identifier detected.`)
          return
        }

        const clinicalDomains = splitList(readCell(row, mapping.clinical_domains))
        records.push({
          user_id: userId,
          title: title.slice(0, 200),
          date: normaliseDate(readCell(row, mapping.date)),
          clinical_domain: clinicalDomains[0] ?? null,
          clinical_domains: clinicalDomains,
          notes: notes || null,
          specialty_tags: normaliseSpecialtyTags(readCell(row, mapping.specialty_tags)),
        })
        return
      }

      const procedureName = readCell(row, mapping.procedure_name).trim()
      const surgicalSpecialty = readCell(row, mapping.surgical_specialty).trim()
      const learningPoints = readCell(row, mapping.learning_points).trim()
      if (!procedureName || !surgicalSpecialty) {
        rowErrors.push(`Row ${rowNumber}: missing procedure or surgical specialty.`)
        return
      }
      if (hasPatientIdentifier(`${procedureName} ${learningPoints}`)) {
        rowErrors.push(`Row ${rowNumber}: possible patient identifier detected.`)
        return
      }

      const role = normaliseRole(readCell(row, mapping.role))
      if (!role.matched) rowWarnings.push(`Row ${rowNumber}: role "${readCell(row, mapping.role)}" imported as Observed.`)
      const supervision = normaliseSupervision(readCell(row, mapping.supervision))
      if (!supervision.matched) rowWarnings.push(`Row ${rowNumber}: supervision "${readCell(row, mapping.supervision)}" left blank.`)

      records.push({
        user_id: userId,
        procedure_name: procedureName.slice(0, 200),
        surgical_specialty: surgicalSpecialty.slice(0, 120),
        date: normaliseDate(readCell(row, mapping.date)),
        role: role.value,
        supervision: supervision.value,
        supervisor_name: readCell(row, mapping.supervisor_name).trim().slice(0, 120) || null,
        learning_points: learningPoints || null,
        specialty_tags: normaliseSpecialtyTags(readCell(row, mapping.specialty_tags)),
        pinned: false,
      })
    })

    return { records, rowErrors, rowWarnings }
  }

  async function handleImport() {
    if (!parsed || !requiredMapped || importing) return

    setImporting(true)
    resetResults()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setErrors(['Please sign in again before importing.'])
      setImporting(false)
      return
    }

    const { records, rowErrors, rowWarnings } = buildRecords(user.id)
    let imported = 0
    const importErrors = [...rowErrors]
    const table = target === 'portfolio' ? 'portfolio_entries' : target === 'cases' ? 'cases' : 'logbook_entries'
    const chunkSize = 100

    for (let offset = 0; offset < records.length; offset += chunkSize) {
      const chunk = records.slice(offset, offset + chunkSize)
      const { error } = await supabase.from(table).insert(chunk)
      if (error) {
        importErrors.push(`Rows ${offset + 2}-${offset + chunk.length + 1}: ${error.message}`)
      } else {
        imported += chunk.length
      }
      setProgress(records.length ? Math.round(((offset + chunk.length) / records.length) * 100) : 100)
    }

    setWarnings(rowWarnings)
    setErrors(importErrors)
    setDone(imported)
    setImporting(false)

    if (imported > 0) {
      addToast(`${imported} ${imported === 1 ? 'row' : 'rows'} imported`, 'success')
      router.refresh()
    }
  }

  function handleTarget(nextTarget: ImportTarget) {
    setTarget(nextTarget)
    resetResults()
    if (parsed) setMapping(buildAutoMapping(parsed.headers, nextTarget))
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {TARGETS.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleTarget(option.value)}
            className={`text-left rounded-lg border p-4 transition-colors ${
              target === option.value
                ? 'border-[#1B6FD9]/50 bg-[#1B6FD9]/10'
                : 'border-white/[0.08] bg-[#141416] hover:border-white/[0.16]'
            }`}
          >
            <span className="block text-sm font-semibold text-[#F5F5F2]">{option.label}</span>
            <span className="mt-1 block text-xs leading-relaxed text-[rgba(245,245,242,0.42)]">{option.description}</span>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-white/[0.07] bg-[#141416] p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="mb-2 text-sm font-medium text-[#F5F5F2]">Upload CSV</h2>
            <p className="max-w-2xl text-xs leading-relaxed text-[rgba(245,245,242,0.42)]">
              The first row must contain headers. Required fields are marked in blue. For cases and logbook rows, imports with obvious patient identifiers are blocked.
            </p>
          </div>
          <button
            type="button"
            onClick={() => downloadTemplate(target)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-[rgba(245,245,242,0.68)] transition-colors hover:border-white/[0.16] hover:text-[#F5F5F2]"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download template
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-[rgba(245,245,242,0.72)] transition-colors hover:bg-white/[0.07]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {fileName || 'Choose CSV file'}
          </button>
          <p className="text-xs text-[rgba(245,245,242,0.34)]">Excel and Google Sheets CSV exports are supported.</p>
        </div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
      </div>

      <FormatRules target={target} />

      {parsed && (
        <div className="rounded-lg border border-white/[0.07] bg-[#141416] p-6">
          <h2 className="mb-4 text-sm font-medium text-[#F5F5F2]">Map columns</h2>
          <div className="space-y-3">
            {fields.map(field => (
              <div key={field.key} className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-center">
                <label className="text-xs font-medium uppercase tracking-wide text-[rgba(245,245,242,0.55)]">
                  {field.label}
                  {field.required && <span className="ml-1 text-[#1B6FD9]">*</span>}
                </label>
                <select
                  value={mapping[field.key] ?? ''}
                  onChange={event => setMapping(current => ({ ...current, [field.key]: event.target.value }))}
                  className={INPUT}
                >
                  <option value="">Not mapped</option>
                  {parsed.headers.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
                {field.help && <p className="sm:col-start-2 text-xs text-[rgba(245,245,242,0.32)]">{field.help}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {previewRows.length > 0 && (
        <div className="rounded-lg border border-white/[0.07] bg-[#141416] p-6">
          <h2 className="mb-4 text-sm font-medium text-[#F5F5F2]">
            Preview <span className="font-normal text-[rgba(245,245,242,0.4)]">first {previewRows.length} of {parsed?.rows.length ?? 0} rows</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {parsed?.headers.map(header => (
                    <th key={header} className="whitespace-nowrap pb-2 pr-4 text-left font-medium text-[rgba(245,245,242,0.4)]">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-white/[0.04]">
                    {parsed?.headers.map((header, cellIndex) => (
                      <td key={header} className="max-w-[220px] truncate py-1.5 pr-4 text-[rgba(245,245,242,0.66)]">
                        {row[cellIndex]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {parsed && (
        <div className="space-y-3">
          {importing && (
            <div className="space-y-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-[#1B6FD9] transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-[rgba(245,245,242,0.42)]">Importing {progress}%</p>
            </div>
          )}

          {done !== null && (
            <div className="rounded-lg border border-[#1B6FD9]/20 bg-[#1B6FD9]/10 px-4 py-3 text-sm font-medium text-[#1B6FD9]">
              {done} {done === 1 ? 'row' : 'rows'} imported.
            </div>
          )}

          {warnings.length > 0 && (
            <MessageList title={`${warnings.length} warning${warnings.length === 1 ? '' : 's'}`} items={warnings} tone="warning" />
          )}

          {errors.length > 0 && (
            <MessageList title={`${errors.length} error${errors.length === 1 ? '' : 's'}`} items={errors} tone="error" />
          )}

          <button
            type="button"
            onClick={handleImport}
            disabled={importing || !requiredMapped}
            className="w-full rounded-xl bg-[#1B6FD9] py-2.5 text-sm font-semibold text-[#0B0B0C] transition-colors hover:bg-[#155BB0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing ? 'Importing...' : `Import ${parsed.rows.length} ${parsed.rows.length === 1 ? 'row' : 'rows'}`}
          </button>
        </div>
      )}
    </div>
  )
}

function MessageList({ title, items, tone }: { title: string; items: string[]; tone: 'warning' | 'error' }) {
  const classes = tone === 'warning'
    ? 'border-amber-500/20 bg-amber-500/10 text-amber-300/85'
    : 'border-red-500/20 bg-red-500/10 text-red-300/85'

  return (
    <div className={`rounded-lg border px-4 py-3 ${classes}`}>
      <p className="mb-1 text-xs font-medium">{title}</p>
      <ul className="space-y-0.5">
        {items.slice(0, 6).map((item, index) => (
          <li key={index} className="text-xs">{item}</li>
        ))}
        {items.length > 6 && <li className="text-xs opacity-70">...and {items.length - 6} more</li>}
      </ul>
    </div>
  )
}

function FormatRules({ target }: { target: ImportTarget }) {
  const roleExamples = 'watched -> Observed, assisted -> First Assist, operator -> Surgeon'
  const supervisionExamples = 'unsupervised -> Independent, talked through -> Directed, watched -> Observed'
  const categoryExamples = 'QIP -> Audit & QIP, course -> Conferences & Courses, DOPS -> Reflections'

  return (
    <div className="rounded-lg border border-white/[0.07] bg-[#141416] p-6">
      <h2 className="mb-3 text-sm font-medium text-[#F5F5F2]">Accepted formats</h2>
      <div className="grid gap-4 text-xs text-[rgba(245,245,242,0.42)] md:grid-cols-3">
        <div>
          <p className="mb-1 font-medium text-[rgba(245,245,242,0.68)]">Dates</p>
          <p className="leading-relaxed">Use `YYYY-MM-DD` or UK-style `DD/MM/YYYY`. Blank dates default to today.</p>
        </div>
        <div>
          <p className="mb-1 font-medium text-[rgba(245,245,242,0.68)]">Lists</p>
          <p className="leading-relaxed">Separate multiple application tags or clinical areas with semicolons. Commas are accepted too.</p>
        </div>
        <div>
          <p className="mb-1 font-medium text-[rgba(245,245,242,0.68)]">Application tags</p>
          <p className="leading-relaxed">Specialty names are converted when matched, e.g. `IMT 2026` to `imt_2026`; unknown tags are left unchanged.</p>
        </div>
        {target === 'portfolio' && (
          <div className="md:col-span-3">
            <p className="mb-1 font-medium text-[rgba(245,245,242,0.68)]">Portfolio categories</p>
            <p className="leading-relaxed">{categoryExamples}. Unknown categories import as `custom` with a warning.</p>
          </div>
        )}
        {target === 'logbook' && (
          <>
            <div>
              <p className="mb-1 font-medium text-[rgba(245,245,242,0.68)]">Roles</p>
              <p className="leading-relaxed">{roleExamples}. Unknown roles import as `Observed` with a warning.</p>
            </div>
            <div>
              <p className="mb-1 font-medium text-[rgba(245,245,242,0.68)]">Supervision</p>
              <p className="leading-relaxed">{supervisionExamples}. Unknown supervision values are left blank.</p>
            </div>
          </>
        )}
        {(target === 'cases' || target === 'logbook') && (
          <div className={target === 'logbook' ? '' : 'md:col-span-3'}>
            <p className="mb-1 font-medium text-[rgba(245,245,242,0.68)]">Anonymisation</p>
            <p className="leading-relaxed">Rows are blocked when obvious identifiers such as DOB labels, NHS numbers, MRN, hospital number, or patient ID are detected.</p>
          </div>
        )}
      </div>
    </div>
  )
}
