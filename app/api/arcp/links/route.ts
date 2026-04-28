import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'

type EntryType = 'portfolio' | 'case'

async function userOwnsEntry(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  entryId: string,
  entryType: EntryType
) {
  const table = entryType === 'portfolio' ? 'portfolio_entries' : 'cases'
  const { data, error } = await supabase
    .from(table)
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

  const supabase = createClient()
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
  if (entry_type !== 'portfolio' && entry_type !== 'case') {
    return NextResponse.json({ error: 'entry_type must be portfolio or case' }, { status: 400 })
  }

  const { data: capability, error: capabilityError } = await supabase
    .from('arcp_capabilities')
    .select('capability_key')
    .eq('capability_key', capability_key)
    .maybeSingle()

  if (capabilityError) return NextResponse.json({ error: capabilityError.message }, { status: 500 })
  if (!capability) return NextResponse.json({ error: 'Capability not found' }, { status: 404 })

  const ownsEntry = await userOwnsEntry(supabase, user.id, entry_id, entry_type)
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
    const status = error.code === '23505' ? 409 : 500
    return NextResponse.json({ error: error.message }, { status })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('arcp_entry_links')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
