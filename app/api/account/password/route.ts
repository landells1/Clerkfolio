import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { safeJsonBody, badJson } from '@/lib/safe-json'
import { notifyPasswordChanged } from '@/lib/notifications/password-changed'

// Server-side password change with current-password reauth.
//
// Without this, a 30-second laptop grab on a logged-in browser is enough to
// take over the account: anyone can navigate to /settings and call
// supabase.auth.updateUser({ password }) without re-entering the current
// password. /update-password is already gated by the cf_recovery cookie, but
// /settings is a fully-authenticated context with no equivalent fresh-auth
// requirement.
export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await safeJsonBody<{ currentPassword?: unknown; newPassword?: unknown }>(req)
  if (!body) return badJson()

  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Current and new passwords are required.' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 })
  }
  if (!user.email) {
    return NextResponse.json({ error: 'Account has no email on file. Contact support.' }, { status: 400 })
  }

  // Verify current password via signInWithPassword. We pass through the
  // existing /api/auth/preflight rate limit by routing-tier? No - this
  // endpoint is its own choke point and we want to fail closed without
  // accidentally giving an attacker a free unlock channel. The Supabase
  // built-in rate limit on signInWithPassword applies, plus this route's
  // origin check.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (signInError) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 })
  }

  // Update via service-role admin API so the operation is atomic with the
  // re-auth check above. supabase.auth.updateUser would also work, but the
  // service-role path is the same one used by the recovery flow and keeps
  // the side-effect surface (refresh tokens) consistent.
  const service = createServiceClient()
  const { error: updateError } = await service.auth.admin.updateUserById(user.id, {
    password: newPassword,
  })
  if (updateError) {
    return NextResponse.json({ error: 'Could not update password. Please try again.' }, { status: 500 })
  }

  // Audit row so the user can see "password changed at X" in /settings/audit-log.
  await service.from('audit_log').insert({
    user_id: user.id,
    action: 'password_changed',
    metadata: { at: new Date().toISOString() },
  })

  // Out-of-band "your password was changed" alert + in-app notification (F-038),
  // identical to the reset path. Best-effort: notification/email failures are
  // swallowed inside the helper so they can't fail the password change.
  await notifyPasswordChanged(service, { userId: user.id, email: user.email, mode: 'in_app' })

  // Updating the password invalidates the session used above. Establish a
  // fresh current session through the SSR client so its cookie callbacks
  // persist valid access and refresh tokens in the browser.
  const { error: refreshError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: newPassword,
  })
  if (refreshError) {
    await supabase.auth.signOut({ scope: 'local' })
    return NextResponse.json(
      { error: 'Password changed. Sign in again to continue.', signInRequired: true },
      { status: 409 }
    )
  }

  // Revoke every older session while preserving the newly created current
  // session. Client signOut accepts a session scope; the admin API expects a
  // JWT rather than a user ID.
  const { error: revokeError } = await supabase.auth.signOut({ scope: 'others' })

  return NextResponse.json({ ok: true, sessionsRevoked: !revokeError })
}
