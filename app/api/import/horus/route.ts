import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'

// Patterns that suggest patient-identifiable information
const PII_PATTERNS = [
  /\b\d{3}\s?\d{3}\s?\d{4}\b/,       // NHS number (10 digits)
  /\b(?:0[1-9]|[12]\d|3[01])\/(?:0[1-9]|1[0-2])\/(?:19|20)\d{2}\b/, // DD/MM/YYYY DOB
  /\b(?:bay|bed|ward)\s*\d+\b/i,      // Ward/bay/bed references
  /\b(?:mr|mrs|ms|miss|dr)\s+[a-z]+\s+[a-z]+/i, // Patient names with title
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

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { rows, dupHandling = 'skip' } = body as {
    rows: {
      date: string
      type: string
      title: string
      category: string
      supervisor_name: string
      supervision_level: string
      notes: string
      specialty_tags: string[]
    }[]
    dupHandling: 'skip' | 'import'
  }

  if (!Array.isArray(rows)) return NextResponse.json({ error: 'rows must be an array' }, { status: 400 })

  let created = 0
  let skipped = 0
  let blocked = 0

  // Scan for PII first
  const validRows = rows.filter(row => {
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
      notes: row.notes || null,
      supervisor_name: row.supervisor_name || null,
      supervision_level: row.supervision_level || null,
      specialty_tags: row.specialty_tags ?? [],
      reflection_type: row.type || null,
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
