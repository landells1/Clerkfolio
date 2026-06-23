import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { fetchSubscriptionInfo } from '@/lib/subscription'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { CATEGORIES, type Category } from '@/lib/types/portfolio'

const IMPORT_RATE_MAX = 5
const IMPORT_RATE_WINDOW_SECONDS = 60 * 60

const CATEGORY_VALUES = new Set(CATEGORIES.map(category => category.value))

// Hard caps so a single import cannot DoS the database or storage. The size cap
// matches the upload-authorize ceiling for backup files; row caps are derived
// from "what a real foundation portfolio looks like" with generous headroom.
const MAX_FILE_BYTES = 25 * 1024 * 1024
const MAX_ROWS_PER_TABLE = 2000

// MAX_FILE_BYTES caps the *compressed* upload; DEFLATE can inflate a 25 MB ZIP
// to gigabytes (zip bomb). Each archive member is streamed out with this cap so
// a hostile backup gets a clean 413 before JSON.parse, not an OOM crash.
const MAX_DECOMPRESSED_BYTES = 50 * 1024 * 1024

class BackupTooLargeError extends Error {}

// Column allowlists - preferred over a BLOCKED_KEYS denylist so that newly
// added internal-only columns can't be set by a crafted import. Mirror the
// shape of NewCase / NewPortfolioEntry from lib/types.
const PORTFOLIO_ALLOWED = new Set([
  'title', 'date', 'category', 'notes', 'specialty_tags', 'interview_themes',
  'audit_type', 'audit_role', 'audit_cycle_stage', 'audit_trust',
  'audit_outcome', 'audit_presented',
  'teaching_type', 'teaching_audience', 'teaching_setting', 'teaching_event',
  'teaching_invited',
  'conf_type', 'conf_event_name', 'conf_attendance', 'conf_level',
  'conf_cpd_hours', 'conf_certificate',
  'pub_type', 'pub_journal', 'pub_authors', 'pub_status', 'pub_doi',
  'leader_role', 'leader_organisation', 'leader_start_date', 'leader_end_date',
  'leader_ongoing',
  'prize_body', 'prize_level', 'prize_description',
  'proc_name', 'proc_setting', 'proc_supervision', 'proc_count',
  'refl_type', 'refl_framework', 'refl_clinical_context', 'refl_supervisor',
  'refl_free_text',
  'custom_free_text',
])
const CASE_ALLOWED = new Set([
  'title', 'date', 'clinical_domain', 'clinical_domains', 'specialty_tags',
  'interview_themes', 'notes',
])
const DEADLINE_ALLOWED = new Set([
  'title', 'due_date', 'completed', 'is_auto', 'source_specialty_key', 'notes',
])
const GOAL_ALLOWED = new Set([
  'category', 'target_count', 'due_date',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function safeArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

// jszip implements .async() on top of this streaming helper; it is documented
// API (StreamHelper) but missing from the bundled .d.ts, hence the cast below.
type JSZipStream = {
  on(event: 'data', cb: (chunk: Uint8Array) => void): JSZipStream
  on(event: 'error', cb: (err: Error) => void): JSZipStream
  on(event: 'end', cb: () => void): JSZipStream
  pause(): JSZipStream
  resume(): JSZipStream
}

function inflateCapped(item: JSZip.JSZipObject): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []
    let total = 0
    let aborted = false
    const stream = (item as unknown as { internalStream(type: 'uint8array'): JSZipStream }).internalStream('uint8array')
    stream.on('data', chunk => {
      if (aborted) return
      total += chunk.length
      if (total > MAX_DECOMPRESSED_BYTES) {
        aborted = true
        stream.pause()
        reject(new BackupTooLargeError())
        return
      }
      chunks.push(chunk)
    })
    stream.on('error', err => {
      if (!aborted) reject(err)
    })
    stream.on('end', () => {
      if (aborted) return
      const merged = new Uint8Array(total)
      let offset = 0
      chunks.forEach(chunk => {
        merged.set(chunk, offset)
        offset += chunk.length
      })
      resolve(new TextDecoder().decode(merged))
    })
    stream.resume()
  })
}

async function readBackup(file: File) {
  if (file.name.toLowerCase().endsWith('.zip')) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer())
    async function readJson(name: string) {
      const match = Object.values(zip.files).find(item => item.name.endsWith(`/raw/${name}`) || item.name === `raw/${name}`)
      if (!match) return []
      return safeArray(JSON.parse(await inflateCapped(match)))
    }
    return {
      portfolio_entries: await readJson('portfolio-entries.json'),
      cases: await readJson('cases.json'),
      deadlines: await readJson('deadlines.json'),
      goals: await readJson('goals.json'),
    }
  }

  const parsed = JSON.parse(await file.text()) as Record<string, unknown>
  return {
    portfolio_entries: safeArray(parsed.portfolio_entries),
    cases: safeArray(parsed.cases),
    deadlines: safeArray(parsed.deadlines),
    goals: safeArray(parsed.goals),
  }
}

function copyInsertable(row: Record<string, unknown>, userId: string, allowed: Set<string>) {
  const next: Record<string, unknown> = { user_id: userId }
  Object.entries(row).forEach(([key, value]) => {
    if (allowed.has(key)) next[key] = value
  })
  return next
}

function entryKey(row: Record<string, unknown>) {
  return `${String(row.title ?? '').trim().toLowerCase()}|${String(row.date ?? '')}|${String(row.category ?? '')}`
}

function caseKey(row: Record<string, unknown>) {
  return `${String(row.title ?? '').trim().toLowerCase()}|${String(row.date ?? '')}|case`
}

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Bulk import is a Pro entitlement. Match the gating used by the Horus
  // import path so users cannot quietly bypass it through this endpoint.
  const sub = await fetchSubscriptionInfo(supabase, user.id)
  if (!sub.limits.canBulkImport) {
    return NextResponse.json({ error: 'Bulk import requires a Pro subscription.' }, { status: 403 })
  }

  const rateLimit = await checkRateLimit({
    key: user.id,
    max: IMPORT_RATE_MAX,
    windowSeconds: IMPORT_RATE_WINDOW_SECONDS,
    prefix: 'import',
  })
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many import requests. Please wait before importing again.' },
      { status: 429, headers: rateLimitHeaders(rateLimit, IMPORT_RATE_WINDOW_SECONDS) },
    )
  }

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Backup file required.' }, { status: 400 })
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'Backup file is too large (25 MB max).' }, { status: 413 })
  }

  let backup: Awaited<ReturnType<typeof readBackup>>
  try {
    backup = await readBackup(file)
  } catch (err) {
    if (err instanceof BackupTooLargeError) {
      return NextResponse.json({ error: 'Backup contents are too large after decompression (50 MB max per file).' }, { status: 413 })
    }
    return NextResponse.json({ error: 'Backup file is not valid Clerkfolio JSON or ZIP.' }, { status: 400 })
  }

  const totalRows =
    backup.portfolio_entries.length +
    backup.cases.length +
    backup.deadlines.length +
    backup.goals.length
  if (
    backup.portfolio_entries.length > MAX_ROWS_PER_TABLE ||
    backup.cases.length > MAX_ROWS_PER_TABLE ||
    backup.deadlines.length > MAX_ROWS_PER_TABLE ||
    backup.goals.length > MAX_ROWS_PER_TABLE ||
    totalRows > MAX_ROWS_PER_TABLE * 2
  ) {
    return NextResponse.json(
      { error: `Backup exceeds the per-import limit (${MAX_ROWS_PER_TABLE} rows per table). Split it and re-run.` },
      { status: 413 }
    )
  }

  const [{ data: existingEntries }, { data: existingCases }] = await Promise.all([
    supabase.from('portfolio_entries').select('title, date, category').eq('user_id', user.id).is('deleted_at', null),
    supabase.from('cases').select('title, date').eq('user_id', user.id).is('deleted_at', null),
  ])
  const existing = new Set([
    ...(existingEntries ?? []).map(entryKey),
    ...(existingCases ?? []).map(caseKey),
  ])

  // `skipped` counts duplicates of already-imported rows (expected on
  // re-import); `errors` reports rows dropped because they are invalid, so a
  // partial import is never silently presented as complete. Row numbers are
  // 1-based positions within each backup table.
  let skipped = 0
  const errors: { table: string; row: number; error: string }[] = []
  const portfolioRows = backup.portfolio_entries
    .filter((row, index) => {
      const category = String(row.category ?? 'custom')
      if (!row.title) {
        errors.push({ table: 'portfolio_entries', row: index + 1, error: 'Missing title' })
        return false
      }
      if (!CATEGORY_VALUES.has(category as Category)) {
        errors.push({ table: 'portfolio_entries', row: index + 1, error: `Invalid category "${category}"` })
        return false
      }
      if (existing.has(entryKey(row))) { skipped++; return false }
      return true
    })
    .map(row => copyInsertable(row, user.id, PORTFOLIO_ALLOWED))

  const caseRows = backup.cases
    .filter((row, index) => {
      if (!row.title) {
        errors.push({ table: 'cases', row: index + 1, error: 'Missing title' })
        return false
      }
      if (existing.has(caseKey(row))) { skipped++; return false }
      return true
    })
    .map(row => copyInsertable(row, user.id, CASE_ALLOWED))

  const deadlineRows = backup.deadlines
    .filter((row, index) => {
      if (!row.title || !row.due_date) {
        errors.push({ table: 'deadlines', row: index + 1, error: !row.title ? 'Missing title' : 'Missing due date' })
        return false
      }
      return true
    })
    .map(row => copyInsertable(row, user.id, DEADLINE_ALLOWED))
  const goalRows = backup.goals
    .filter((row, index) => {
      if (!row.category) {
        errors.push({ table: 'goals', row: index + 1, error: 'Missing category' })
        return false
      }
      return true
    })
    .map(row => copyInsertable(row, user.id, GOAL_ALLOWED))

  const [portfolioResult, caseResult, deadlineResult, goalResult] = await Promise.all([
    portfolioRows.length ? supabase.from('portfolio_entries').insert(portfolioRows).select('id') : Promise.resolve({ data: [], error: null }),
    caseRows.length ? supabase.from('cases').insert(caseRows).select('id') : Promise.resolve({ data: [], error: null }),
    deadlineRows.length ? supabase.from('deadlines').insert(deadlineRows).select('id') : Promise.resolve({ data: [], error: null }),
    goalRows.length ? supabase.from('goals').insert(goalRows).select('id') : Promise.resolve({ data: [], error: null }),
  ])

  const firstError = [portfolioResult.error, caseResult.error, deadlineResult.error, goalResult.error].find(Boolean)
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 })

  return NextResponse.json({
    portfolio_entries: portfolioResult.data?.length ?? 0,
    cases: caseResult.data?.length ?? 0,
    deadlines: deadlineResult.data?.length ?? 0,
    goals: goalResult.data?.length ?? 0,
    skipped,
    errors,
  })
}
