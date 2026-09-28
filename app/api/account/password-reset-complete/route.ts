import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { notifyPasswordChanged } from '@/lib/notifications/password-changed'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'

// A real reset calls this once. Bound replays so a signed-in session looping
// the endpoint cannot fan out unlimited "password changed" emails.
const RESET_COMPLETE_LIMIT = { max: 3, windowSeconds: 60 * 60, prefix: 'password-reset-complete' }

// Called by /update-password after a successful reset-link password change.
//
// The reset itself happens client-side via supabase.auth.updateUser({ password })
// in a short-lived recovery session, so the server never sees it. Before this
// route, a reset left NO trace in /settings/audit-log (only the in-app change
// path was audited) and sent no out-of-band alert — exactly the event an
// account takeover would use (F-038). This route writes the missing
// `password_reset` audit row and fires the "your password was changed" email +
// notification, mirroring the in-app path.
//
// It only ever acts on the authenticated caller's own account, so the worst a
// stray call can do is email/notify the caller about their own account.
export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const rateLimit = await checkRateLimit({ key: user.id, ...RESET_COMPLETE_LIMIT })
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests.' },
      { status: 429, headers: rateLimitHeaders(rateLimit, RESET_COMPLETE_LIMIT.windowSeconds) }
    )
  }

  const service = createServiceClient()

  const { error: auditError } = await service.from('audit_log').insert({
    user_id: user.id,
    action: 'password_reset',
    metadata: { at: new Date().toISOString() },
  })
  if (auditError) console.error('password-reset-complete: audit insert failed:', auditError.message)

  await notifyPasswordChanged(service, { userId: user.id, email: user.email ?? null, mode: 'reset' })

  return NextResponse.json({ ok: true })
}
