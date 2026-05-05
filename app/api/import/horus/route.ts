import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { fetchSubscriptionInfo } from '@/lib/subscription'
import { CATEGORIES, type Category } from '@/lib/types/portfolio'

// Patterns that suggest patient-identifiable information.
// Tighter than the previous version: title-prefixed names must start with capitals
// (avoids "dr foo bar" in lower-case prose); MRN/NHS pattern keeps the
// 3-3-4 grouping so it doesn't trip on phone numbers or 10-digit codes.
const PII_PATTERNS = [
  /\b\d{3}\s\d{3}\s\d{4}\b/,                                              // NHS number (10 digits in 3-3-4 with mandatory spaces)
  /\b(?:0[1-9]|[12]\d|3[01])\/(?:0[1-9]|1[0-2])\/(?:19|20)\d{2}\b/,        // DD/MM/YYYY DOB
  /\b(?:bay|bed|ward)\s*\d+\b/i,                                           // Ward/bay/bed references
  /\b(?:Mr|Mrs|Ms|Miss|Dr)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/,            // Title + capitalised name (Smith Jones / Smith)
  /\b(?:Mr|Mrs|Ms|Miss|Dr)\s+[A-Z]\.?\s*[A-Z]\.?\b/,                       // Title + initials (Mr A.B / Ms K.D)
]

function containsPII(str: string): boolean {
  return PII_PATTERNS.some(p => p.test(str))
}

function parseDate(raw: string): string | null {
  if (!raw) return null
  // Try DD/MM/YYYY
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  // Try YYYY-MM-DD
  const iso = raw.match(/^\d{4}-\d{2}-\d{2}$/)
  if (iso) return raw
  // Try D Month YYYY
  const mdy = new Date(raw)
  if (!isNaN(mdy.getTime())) return mdy.toISOString().split('T')[0]
  return null
}

function mapReflectionType(raw: string): 'cbd' | 'dop' | 'mini_cex' | 'reflection' | null {
  const value = raw.toLowerCase()
  if (value.includes('cbd') || value.includes('case-based')) return 'cbd'
  if (value.includes('mini-cex') || value.includes('minicex')) return 'mini_cex'
  if (value.includes('dop') || value.includes('directly observed')) return 'dop'
  if (value.includes('reflection') || value.includes('acat') || value.includes('acute care')) return 'reflection'
  return null
}

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

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sub = await fetchSubscriptionInfo(supabase, user.id)
  if (!sub.limits.canBulkImport) {
    return NextResponse.json(
      { error: 'Bulk import requires a Pro subscription.' },
      { status: 403 }
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
  let blocked = 0

  // Scan for PII first
  const parsedRows = rows.map(parseRow)
  const validRows = parsedRows.filter((row): row is HorusRow => {
    if (!row) { skipped++; return false }
    const combined = [row.title, row.notes, row.supervisor_name].join(' ')
    if (containsPII(combined)) {
      blocked++
      return false
    }
    if (!row.title?.trim()) { skipped++; return false }
    return true
  })

  if (validRows.length === 0) {
    return NextResponse.json({ created: 0, skipped, blocked })
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

  for (const row of validRows) {
    const parsedDate = parseDate(row.date) ?? today
    const key = `${row.title.toLowerCase().trim()}|${parsedDate}`

    if (dupHandling === 'skip' && existingPairs.has(key)) {
      skipped++
      continue
    }

    toInsert.push({
      user_id: user.id,
      title: row.title.trim(),
      date: parsedDate,
      category: row.category,
      notes: buildNotes(row),
      specialty_tags: row.specialty_tags ?? [],
      refl_type: row.category === 'reflection' ? mapReflectionType(row.type) : null,
    })
  }

  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from('portfolio_entries')
      .insert(toInsert)
      .select('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    created = data?.length ?? 0
    skipped += validRows.length - toInsert.length
  }

  return NextResponse.json({ created, skipped, blocked })
}
