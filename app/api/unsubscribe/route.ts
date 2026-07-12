import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyUnsubscribeToken, applyUnsubscribe } from '@/lib/notifications/unsubscribe'

export const dynamic = 'force-dynamic'

// Public, login-free email unsubscribe. Authorization is the unguessable HMAC
// token itself, so this route deliberately does NOT run validateOrigin: RFC 8058
// one-click unsubscribes POST here cross-origin from the mail provider, and
// there is no ambient session/cookie authority to protect against CSRF.
async function handle(token: string | null) {
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Missing unsubscribe token.' }, { status: 400 })
  }

  const parsed = verifyUnsubscribeToken(token)
  if (!parsed) {
    return NextResponse.json({ ok: false, error: 'This unsubscribe link is invalid or has expired.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: profile, error } = await service
    .from('profiles')
    .select('notification_preferences')
    .eq('id', parsed.userId)
    .maybeSingle()

  if (error) {
    console.error('unsubscribe: profile fetch failed:', error.message)
    return NextResponse.json({ ok: false, error: 'Could not update your preferences. Please try again.' }, { status: 500 })
  }

  const nextPrefs = applyUnsubscribe(
    (profile?.notification_preferences ?? null) as Record<string, unknown> | null,
    parsed.list,
  )

  const { error: updateError } = await service
    .from('profiles')
    .update({ notification_preferences: nextPrefs })
    .eq('id', parsed.userId)

  if (updateError) {
    console.error('unsubscribe: preferences update failed:', updateError.message)
    return NextResponse.json({ ok: false, error: 'Could not update your preferences. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, list: parsed.list })
}

export async function POST(req: NextRequest) {
  return handle(req.nextUrl.searchParams.get('token'))
}
