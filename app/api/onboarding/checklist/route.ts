import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { safeJsonBody, badJson } from '@/lib/safe-json'

// Persist the dashboard onboarding checklist state (dismissed flag + ticked
// items). Both columns are protected by the guard_profile_writes trigger, which
// silently reverts them on any non-service-role UPDATE, so a browser-side
// supabase.update() "succeeds" but changes nothing. The write has to go through
// a service-role client behind auth + origin checks - the same posture as
// /api/settings/restart-tutorial, which writes the same two columns.

type Payload = {
  dismissed?: unknown
  completedItems?: unknown
}

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await safeJsonBody<Payload>(req)
  if (!body || typeof body !== 'object') return badJson()

  const update: {
    onboarding_checklist_dismissed?: boolean
    onboarding_checklist_completed_items?: string[]
  } = {}

  if (typeof body.dismissed === 'boolean') {
    update.onboarding_checklist_dismissed = body.dismissed
  }

  if (Array.isArray(body.completedItems)) {
    // Shape-validate only: these are the user's own checklist keys and carry no
    // entitlement value. Cap count/length so a crafted payload can't bloat the
    // row, and dedupe so repeat ticks stay tidy.
    const items = Array.from(
      new Set(
        body.completedItems
          .filter((k): k is string => typeof k === 'string')
          .map(k => k.trim())
          .filter(k => k.length > 0 && k.length <= 64)
      )
    ).slice(0, 20)
    update.onboarding_checklist_completed_items = items
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('profiles')
    .update(update)
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
