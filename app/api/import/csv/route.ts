import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { fetchSubscriptionInfo } from '@/lib/subscription'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { CATEGORIES, type Category } from '@/lib/types/portfolio'
import { IMPORT_RATE_MAX, IMPORT_RATE_WINDOW_SECONDS, copyInsertable, isRecord } from '@/lib/import/shared'

const MAX_ROWS = 2000

const CATEGORY_VALUES = new Set(CATEGORIES.map(category => category.value))

const PORTFOLIO_ALLOWED = new Set([
  'title', 'date', 'category', 'notes', 'specialty_tags', 'interview_themes',
  'refl_free_text',
])
const CASE_ALLOWED = new Set([
  'title', 'date', 'clinical_domain', 'clinical_domains', 'specialty_tags',
  'interview_themes', 'notes',
])

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Bulk import is a Pro entitlement. Mirror /api/import/json so users cannot
  // sidestep the gate by going through the CSV flow.
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

  const body = await req.json().catch(() => null)
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const target = body.target === 'cases' ? 'cases' : 'portfolio'
  const rawRows = Array.isArray(body.rows) ? body.rows.filter(isRecord) : []

  if (rawRows.length === 0) {
    return NextResponse.json({ error: 'No rows to import.' }, { status: 400 })
  }
  if (rawRows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Import exceeds the per-batch limit (${MAX_ROWS} rows). Split it and re-run.` },
      { status: 413 },
    )
  }

  const allowed = target === 'portfolio' ? PORTFOLIO_ALLOWED : CASE_ALLOWED
  // Row numbers are 1-based positions within the uploaded data rows so the
  // user can find the offending line in their file.
  const errors: { row: number; error: string }[] = []
  const validRows = rawRows
    .filter((row, index) => {
      if (!row.title || typeof row.title !== 'string' || !row.title.trim()) {
        errors.push({ row: index + 1, error: 'Missing title' })
        return false
      }
      if (target === 'portfolio') {
        const category = String(row.category ?? 'custom')
        if (!CATEGORY_VALUES.has(category as Category)) {
          errors.push({ row: index + 1, error: `Invalid category "${category}"` })
          return false
        }
      }
      return true
    })
    .map(row => copyInsertable(row, user.id, allowed))

  if (validRows.length === 0) {
    return NextResponse.json({ imported: 0, skipped: errors.length, errors }, { status: 400 })
  }

  const table = target === 'portfolio' ? 'portfolio_entries' : 'cases'
  const { error } = await supabase.from(table).insert(validRows)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ imported: validRows.length, skipped: errors.length, errors })
}
