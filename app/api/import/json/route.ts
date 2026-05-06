import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { CATEGORIES, type Category } from '@/lib/types/portfolio'

const CATEGORY_VALUES = new Set(CATEGORIES.map(category => category.value))
const BLOCKED_KEYS = new Set(['id', 'user_id', 'created_at', 'updated_at', 'deleted_at', 'specialty_tag_labels', 'clinical_area_labels'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function safeArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

async function readBackup(file: File) {
  if (file.name.toLowerCase().endsWith('.zip')) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer())
    async function readJson(name: string) {
      const match = Object.values(zip.files).find(item => item.name.endsWith(`/raw/${name}`) || item.name === `raw/${name}`)
      if (!match) return []
      return safeArray(JSON.parse(await match.async('string')))
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

function copyInsertable(row: Record<string, unknown>, userId: string) {
  const next: Record<string, unknown> = { user_id: userId }
  Object.entries(row).forEach(([key, value]) => {
    if (!BLOCKED_KEYS.has(key)) next[key] = value
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

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Backup file required.' }, { status: 400 })

  let backup: Awaited<ReturnType<typeof readBackup>>
  try {
    backup = await readBackup(file)
  } catch {
    return NextResponse.json({ error: 'Backup file is not valid Clerkfolio JSON or ZIP.' }, { status: 400 })
  }

  const [{ data: existingEntries }, { data: existingCases }] = await Promise.all([
    supabase.from('portfolio_entries').select('title, date, category').eq('user_id', user.id),
    supabase.from('cases').select('title, date').eq('user_id', user.id),
  ])
  const existing = new Set([
    ...(existingEntries ?? []).map(entryKey),
    ...(existingCases ?? []).map(caseKey),
  ])

  let skipped = 0
  const portfolioRows = backup.portfolio_entries
    .filter(row => {
      const category = String(row.category ?? 'custom')
      const valid = row.title && CATEGORY_VALUES.has(category as Category)
      if (!valid || existing.has(entryKey(row))) { skipped++; return false }
      return true
    })
    .map(row => copyInsertable(row, user.id))

  const caseRows = backup.cases
    .filter(row => {
      const valid = row.title
      if (!valid || existing.has(caseKey(row))) { skipped++; return false }
      return true
    })
    .map(row => copyInsertable(row, user.id))

  const deadlineRows = backup.deadlines
    .filter(row => row.title && row.due_date)
    .map(row => copyInsertable(row, user.id))
  const goalRows = backup.goals
    .filter(row => row.category)
    .map(row => copyInsertable(row, user.id))

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
  })
}
