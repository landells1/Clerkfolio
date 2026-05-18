import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { safeJsonBody, badJson } from '@/lib/safe-json'

// Session fingerprint UPDATE/DELETE was removed from the authenticated RLS
// policy in the 2026-05-18 audit migration. A revoked session could
// previously call supabase.from('session_fingerprints').update(...) directly
// and clear its own revoked_at, defeating the middleware kick-out check.
// Revocation now flows through this server route which uses the service-role
// client so the write bypasses RLS but enforces ownership in the route.
export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await safeJsonBody<{ id?: unknown }>(req)
  if (!body) return badJson()
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('session_fingerprints')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Session not found or already revoked.' }, { status: 404 })

  return NextResponse.json({ success: true })
}
