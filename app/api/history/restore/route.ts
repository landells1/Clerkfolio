import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'

type EntryType = 'portfolio' | 'case'

const TABLES: Record<EntryType, string> = {
  portfolio: 'portfolio_entries',
  case: 'cases',
}

function restorePayload(snapshot: Record<string, unknown>) {
  const copy = { ...snapshot }
  delete copy.id
  delete copy.user_id
  delete copy.created_at
  copy.updated_at = new Date().toISOString()
  return copy
}

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const revisionId = typeof body.revisionId === 'string' ? body.revisionId : ''
  const entryType = body.entryType === 'portfolio' || body.entryType === 'case' ? body.entryType as EntryType : null
  if (!revisionId || !entryType) {
    return NextResponse.json({ error: 'revisionId and entryType are required' }, { status: 400 })
  }

  const { data: revision, error: revisionError } = await supabase
    .from('entry_revisions')
    .select('id, entry_id, entry_type, snapshot')
    .eq('id', revisionId)
    .eq('entry_type', entryType)
    .eq('user_id', user.id)
    .single()

  if (revisionError || !revision) {
    return NextResponse.json({ error: 'Revision not found' }, { status: 404 })
  }

  const table = TABLES[entryType]
  const { data: current, error: currentError } = await supabase
    .from(table)
    .select('*')
    .eq('id', revision.entry_id)
    .eq('user_id', user.id)
    .single()

  if (currentError || !current) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }

  const { error: snapshotError } = await supabase
    .from('entry_revisions')
    .insert({
      user_id: user.id,
      entry_id: revision.entry_id,
      entry_type: entryType,
      snapshot: current,
    })

  if (snapshotError) return NextResponse.json({ error: snapshotError.message }, { status: 500 })

  const { error: restoreError } = await supabase
    .from(table)
    .update(restorePayload(revision.snapshot as Record<string, unknown>))
    .eq('id', revision.entry_id)
    .eq('user_id', user.id)

  if (restoreError) return NextResponse.json({ error: restoreError.message }, { status: 500 })

  const { data: excess } = await supabase
    .from('entry_revisions')
    .select('id')
    .eq('user_id', user.id)
    .eq('entry_id', revision.entry_id)
    .eq('entry_type', entryType)
    .order('created_at', { ascending: false })
    .range(50, 200)

  if (excess?.length) {
    await supabase.from('entry_revisions').delete().in('id', excess.map(row => row.id))
  }

  return NextResponse.json({ ok: true, entryId: revision.entry_id })
}

