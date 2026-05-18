import { randomBytes, createHash } from 'crypto'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { institutionalEmailHelpText, isInstitutionEmail, normaliseEmail } from '@/lib/institutional-email'

const SEND_COOLDOWN_MS = 60 * 1000
const TOKEN_TTL_HOURS = 24

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function htmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const email = normaliseEmail(body?.email)

  if (!isInstitutionEmail(email)) {
    return NextResponse.json({ error: institutionalEmailHelpText() }, { status: 400 })
  }

  const service = createServiceClient()
  // Exact lowercase match (we store normalised emails). ilike would treat
  // _ and % in user-supplied input as wildcards, which could false-match
  // legitimate institutional addresses.
  const { data: existingVerifiedProfile } = await service
    .from('profiles')
    .select('id')
    .eq('student_email_verified', true)
    .eq('student_email', email)
    .neq('id', user.id)
    .maybeSingle()

  if (existingVerifiedProfile) {
    return NextResponse.json({ error: 'This institutional email is already verified on another Clerkfolio account.' }, { status: 409 })
  }

  // Block if another user has an unconsumed token for the same email. The
  // partial index on lower(email) WHERE consumed_at IS NULL on the tokens
  // table makes the lookup cheap. All writers normalise email to lower-case
  // before insert, so an exact eq is safe. Stops the "spam someone else's
  // NHS inbox by claiming their email from multiple accounts" amplifier.
  const { data: crossUserPending } = await service
    .from('student_email_verification_tokens')
    .select('id')
    .eq('email', email)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .neq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (crossUserPending) {
    return NextResponse.json(
      { error: 'A verification is already pending for this email on another account. Please wait for it to expire (24h) before retrying.' },
      { status: 409 }
    )
  }

  // Invalidate any prior unconsumed tokens for THIS user, regardless of
  // which email they were for. Keeps the "latest one" the only valid token
  // and means a typo retry doesn't leave two valid links in different
  // inboxes.
  await service
    .from('student_email_verification_tokens')
    .update({ consumed_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('consumed_at', null)

  const { data: profile } = await service
    .from('profiles')
    .select('student_email_verification_sent_at')
    .eq('id', user.id)
    .single()

  const lastSentAt = profile?.student_email_verification_sent_at
    ? new Date(profile.student_email_verification_sent_at).getTime()
    : 0

  if (lastSentAt && Date.now() - lastSentAt < SEND_COOLDOWN_MS) {
    return NextResponse.json({ error: 'Please wait a minute before requesting another verification link.' }, { status: 429 })
  }

  const token = randomBytes(32).toString('base64url')
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString()
  const now = new Date().toISOString()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
  // Use a landing page rather than the API route directly, so email scanners
  // (e.g. Outlook Safe Links) that auto-fetch URLs cannot consume the one-time token.
  const confirmUrl = new URL('/verify-email', appUrl)
  confirmUrl.searchParams.set('token', token)

  // Send the email BEFORE writing the verification-sent-at timestamp or the
  // token row. A Resend outage previously left the profile in a "pending"
  // state with a token row but no email - the user saw "verification sent"
  // for an email they never received. New ordering: send -> insert token ->
  // update profile.sent_at (rate-limit clock).
  //
  // Importantly we no longer downgrade the existing verification when the
  // user submits a NEW email for verification. The new institutional email
  // only takes effect once /api/student-email/confirm consumes the token;
  // until then, the user's current verified email stays active. This closes
  // the "typo in the new email irreversibly downgrades me" trap and the
  // "spam someone else's institutional inbox by claiming their email"
  // amplifier.
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: sendError } = await resend.emails.send({
    from: 'Clerkfolio <noreply@clerkfolio.co.uk>',
    to: email,
    subject: 'Verify your Clerkfolio institutional email',
    text: `Verify your institutional email for Clerkfolio:\n\n${confirmUrl.toString()}\n\nThis link expires in ${TOKEN_TTL_HOURS} hours.`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #1B6FD9;">Verify your institutional email</h2>
        <p>Use this link to verify <strong>${htmlEscape(email)}</strong> for Clerkfolio institutional access and referral rewards.</p>
        <p><a href="${confirmUrl.toString()}" style="display: inline-block; background: #1B6FD9; color: #fff; padding: 10px 16px; border-radius: 8px; text-decoration: none;">Verify institutional email</a></p>
        <p style="color: #666; font-size: 13px;">This link expires in ${TOKEN_TTL_HOURS} hours.</p>
      </div>
    `,
  })

  if (sendError) {
    console.error('student-email send-verification: Resend error:', sendError.message)
    return NextResponse.json({ error: 'Failed to send verification email. Please try again.' }, { status: 500 })
  }

  const { error: insertError } = await service
    .from('student_email_verification_tokens')
    .insert({
      user_id: user.id,
      email,
      token_hash: tokenHash,
      expires_at: expiresAt,
    })

  if (insertError) {
    console.error('student-email send-verification: token insert failed:', insertError.message)
    return NextResponse.json({ error: 'Could not record verification link. Please try again.' }, { status: 500 })
  }

  // Only the rate-limit clock is touched on profiles - the existing
  // verified email and tier stay intact until confirm.
  await service
    .from('profiles')
    .update({ student_email_verification_sent_at: now })
    .eq('id', user.id)

  return NextResponse.json({ ok: true })
}
