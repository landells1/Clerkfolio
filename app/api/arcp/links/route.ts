import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'

type EntryType = 'portfolio'

async function userOwnsEntry(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  entryId: string,
  entryType: EntryType
) {
  const { data, error } = await supabase
    .from('portfolio_entries')
    .select('id')
    .eq('id', entryId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { capability_key?: unknown; entry_id?: unknown; entry_type?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { capability_key, entry_id, entry_type } = body
  if (typeof capability_key !== 'string' || !capability_key.trim()) {
    return NextResponse.json({ error: 'capability_key is required' }, { status: 400 })
  }
  if (typeof entry_id !== 'string' || !entry_id.trim()) {
    return NextResponse.json({ error: 'entry_id is required' }, { status: 400 })
  }
  if (entry_type !== 'portfolio') {
    return NextResponse.json({ error: 'entry_type must be portfolio' }, { status: 400 })
  }

  const { data: capability, error: capabilityError } = await supabase
    .from('arcp_capabilities')
    .select('capability_key')
    .eq('capability_key', capability_key)
    .maybeSingle()

  if (capabilityError) {
    console.error('arcp/links capability lookup error:', capabilityError.message)
    return NextResponse.json({ error: 'Failed to verify capability. Please try again.' }, { status: 500 })
  }
  if (!capability) return NextResponse.json({ error: 'Capability not found' }, { status: 404 })

  // userOwnsEntry throws on a Supabase error; keep the route's JSON error
  // shape instead of letting it bubble to Next's default 500 page.
  let ownsEntry: boolean
  try {
    ownsEntry = await userOwnsEntry(supabase, user.id, entry_id, entry_type)
  } catch (err) {
    console.error('arcp/links ownership check error:', err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json(
      { error: 'Failed to verify entry ownership. Please try again.' },
      { status: 500 }
    )
  }
  if (!ownsEntry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('arcp_entry_links')
    .insert({
      user_id: user.id,
      capability_key,
      entry_id,
      entry_type,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This entry is already linked to that capability.' }, { status: 409 })
    }
    console.error('arcp/links insert error:', error.message)
    return NextResponse.json({ error: 'Failed to link entry. Please try again.' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('arcp_entry_links')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('arcp/links delete error:', error.message)
    return NextResponse.json({ error: 'Failed to remove link. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
