import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { fetchSubscriptionInfo } from '@/lib/subscription'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { CATEGORIES, type Category } from '@/lib/types/portfolio'
import { IMPORT_RATE_MAX, IMPORT_RATE_WINDOW_SECONDS } from '@/lib/import/shared'
import { parseDate, mapReflectionType } from '@/lib/import/horus-parse'

function buildNotes(row: { notes: string; type: string; supervisor_name: string; supervision_level: string }) {
  return [
    row.notes,
    row.type ? `Imported Horus type: ${row.type}` : '',
    row.supervisor_name ? `Supervisor/assessor: ${row.supervisor_name}` : '',
    row.supervision_level ? `Outcome/level: ${row.supervision_level}` : '',
  ].filter(Boolean).join('\n\n') || null
}

const CATEGORY_VALUES = new Set(CATEGORIES.map(category => category.value))

type HorusRow = {
  date: string
  type: string
  title: string
  category: Category
  supervisor_name: string
  supervision_level: string
  notes: string
  specialty_tags: string[]
}

function cleanString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function parseRow(value: unknown): HorusRow | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const category = typeof row.category === 'string' && CATEGORY_VALUES.has(row.category as Category)
    ? row.category as Category
    : 'reflection'

  return {
    date: cleanString(row.date, 64),
    type: cleanString(row.type, 120),
    title: cleanString(row.title, 200),
    category,
    supervisor_name: cleanString(row.supervisor_name, 160),
    supervision_level: cleanString(row.supervision_level, 160),
    notes: cleanString(row.notes, 10000),
    specialty_tags: Array.isArray(row.specialty_tags)
      ? row.specialty_tags.filter((tag): tag is string => typeof tag === 'string').map(tag => tag.trim()).filter(Boolean).slice(0, 10)
      : [],
  }
}

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sub = await fetchSubscriptionInfo(supabase, user.id)
  if (!sub.limits.canBulkImport) {
    return NextResponse.json(
      { error: 'Bulk import requires a Pro subscription.' },
      { status: 403 }
    )
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

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const rawBody = body as Record<string, unknown>
  const rows = rawBody.rows
  const dupHandling = rawBody.dupHandling === 'import' ? 'import' : 'skip'

  if (!Array.isArray(rows)) return NextResponse.json({ error: 'rows must be an array' }, { status: 400 })
  if (rows.length > 500) {
    return NextResponse.json({ error: 'Maximum 500 rows per import. Split your file and import in batches.' }, { status: 400 })
  }

  let created = 0
  let skipped = 0
  // Row numbers are 1-based positions within the uploaded rows so the user
  // can find the offending line in their Horus export.
  const errors: { row: number; error: string }[] = []

  const parsedRows = rows.map((value, index) => ({ row: parseRow(value), index }))
  const validRows = parsedRows.filter((item): item is { row: HorusRow; index: number } => {
    if (!item.row) {
      errors.push({ row: item.index + 1, error: 'Unreadable row' })
      skipped++
      return false
    }
    if (!item.row.title?.trim()) {
      errors.push({ row: item.index + 1, error: 'Missing title' })
      skipped++
      return false
    }
    return true
  })

  if (validRows.length === 0) {
    return NextResponse.json({ created: 0, skipped, errors })
  }

  // If skip-duplicates mode, fetch existing titles+dates for this user
  const existingPairs = new Set<string>()
  if (dupHandling === 'skip') {
    const { data: existing } = await supabase
      .from('portfolio_entries')
      .select('title, date')
      .eq('user_id', user.id)
      .is('deleted_at', null)

    existing?.forEach(e => existingPairs.add(`${e.title?.toLowerCase().trim()}|${e.date}`))
  }

  // Build insert rows
  const today = new Date().toISOString().split('T')[0]
  const toInsert = []

  for (const { row, index } of validRows) {
    const parsedDate = parseDate(row.date) ?? today
    const key = `${row.title.toLowerCase().trim()}|${parsedDate}`
    const notes = buildNotes(row)

    if (dupHandling === 'skip' && existingPairs.has(key)) {
      skipped++
      continue
    }

    const payload = {
      user_id: user.id,
      title: row.title.trim(),
      date: parsedDate,
      category: row.category,
      notes,
      specialty_tags: row.specialty_tags ?? [],
      refl_type: row.category === 'reflection' ? mapReflectionType(row.type) : null,
    }
    toInsert.push(payload)
  }

  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from('portfolio_entries')
      .insert(toInsert)
      .select('id')

    if (error) {
      console.error('import/horus insert error:', error.message)
      return NextResponse.json({ error: 'Failed to import entries. Please try again.' }, { status: 500 })
    }
    created = data?.length ?? 0
    // Duplicate rows already incremented `skipped` inside the build loop;
    // adding validRows.length - toInsert.length here double-counted them.
  }

  return NextResponse.json({ created, skipped, errors })
}
