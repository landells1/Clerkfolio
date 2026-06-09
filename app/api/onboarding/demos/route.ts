import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'

// Remove the seeded sample data: soft-delete the demo entries/cases and mark
// the profile so the starter pack is never re-seeded or re-prompted.
export async function DELETE(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const now = new Date().toISOString()
  await Promise.all([
    supabase.from('portfolio_entries').update({ deleted_at: now }).eq('user_id', user.id).eq('is_demo', true),
    supabase.from('cases').update({ deleted_at: now }).eq('user_id', user.id).eq('is_demo', true),
    supabase.from('profiles').update({ demo_dismissed_at: now }).eq('id', user.id),
  ])
  return NextResponse.json({ ok: true })
}

// Dismiss the sample-data banner without deleting the demo entries - for users
// who want to edit the demos into their own. Only marks the profile so the
// banner and re-seeding stay off; the entries are left in place.
export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  await supabase.from('profiles').update({ demo_dismissed_at: new Date().toISOString() }).eq('id', user.id)
  return NextResponse.json({ ok: true })
}
