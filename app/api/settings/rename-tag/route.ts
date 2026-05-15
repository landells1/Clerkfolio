import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'

const ALLOWED_FIELDS = new Set(['specialty_tags', 'interview_themes'])

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { p_old, p_new, p_field } = body as Record<string, unknown>

  if (typeof p_old !== 'string' || !p_old.trim()) {
    return NextResponse.json({ error: 'p_old is required' }, { status: 400 })
  }
  if (typeof p_new !== 'string' || !p_new.trim()) {
    return NextResponse.json({ error: 'p_new is required' }, { status: 400 })
  }
  if (typeof p_field !== 'string' || !ALLOWED_FIELDS.has(p_field)) {
    return NextResponse.json({ error: 'p_field must be specialty_tags or interview_themes' }, { status: 400 })
  }

  const { error } = await supabase.rpc('rename_user_tag', {
    p_old: p_old.trim(),
    p_new: p_new.trim(),
    p_field,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
