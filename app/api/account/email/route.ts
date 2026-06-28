import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { safeJsonBody, badJson } from '@/lib/safe-json'
import { isValidEmail, normaliseEmail } from '@/lib/institutional-email'

// Change the account/login email (F-037). Doctors predictably lose their signup
// inbox at the student->FY and rotation transitions; without this they are
// permanently locked out (password-reset links go to the dead inbox).
//
// Flow: current-password reauth -> supabase.auth.updateUser({ email }) sends a
// confirmation link to the new address (and, with secure email change, the old).
// The auth.users.email swap happens only on confirmation, which fires both the
// audit trigger (audit_auth_email_change -> `auth_email_changed` row) and the
// institutional re-derivation trigger. Nothing here mutates the email directly.
export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!user.email) {
    return NextResponse.json({ error: 'Account has no email on file. Contact support.' }, { status: 400 })
  }

  const body = await safeJsonBody<{ newEmail?: unknown; currentPassword?: unknown }>(req)
  if (!body) return badJson()

  const newEmail = normaliseEmail(body.newEmail)
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''

  if (!newEmail || !isValidEmail(newEmail)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  if (!currentPassword) {
    return NextResponse.json({ error: 'Enter your current password to confirm this change.' }, { status: 400 })
  }
  if (newEmail === normaliseEmail(user.email)) {
    return NextResponse.json({ error: 'That is already your account email.' }, { status: 400 })
  }

  // Reauth with the current password — the same fresh-auth choke point the
  // password-change route uses, so a brief unattended session can't repoint the
  // login email. signInWithPassword refreshes the same user's session.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (signInError) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 })
  }

  const { error: updateError } = await supabase.auth.updateUser({ email: newEmail })
  if (updateError) {
    // Most commonly the address is already registered. Keep the message generic
    // so we don't confirm whether a given address has an account.
    return NextResponse.json(
      { error: 'Could not start the email change. The address may already be in use.' },
      { status: 400 },
    )
  }

  return NextResponse.json({ ok: true })
}
