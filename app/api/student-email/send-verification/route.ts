import { randomBytes, createHash } from 'crypto'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { institutionalEmailHelpText, isInstitutionEmail, normaliseEmail } from '@/lib/institutional-email'

const TOKEN_TTL_HOURS = 24
const SEND_COOLDOWN_SECONDS = 60

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

  // Pre-check: another verified profile already owns this institutional email.
  // Done outside the reservation RPC because we never want to even create a
  // token (and burn a cooldown slot) for a doomed verification.
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

  const token = randomBytes(32).toString('base64url')
  const tokenHash = hashToken(token)

  // reserve_student_email_token holds a row-level lock on the profile, checks
  // the cooldown, consumes any prior live token for this user, and inserts the
  // new token row - all in one transaction. Unique partial index on
  // (user_id) WHERE consumed_at IS NULL means a concurrent reservation from a
  // second tab loses with a unique-violation rather than producing two live
  // tokens. Cooldown check happens BEFORE consume-old, so a resend inside
  // cooldown returns 'cooldown' without invalidating the inbox link.
  const { data: reservation, error: reserveError } = await service
    .rpc('reserve_student_email_token', {
      p_user_id: user.id,
      p_email: email,
      p_token_hash: tokenHash,
      p_ttl_hours: TOKEN_TTL_HOURS,
      p_cooldown_seconds: SEND_COOLDOWN_SECONDS,
    })
    .single<{ status: string; last_sent_at: string | null }>()

  if (reserveError || !reservation) {
    console.error('student-email send-verification: reserve RPC failed:', reserveError?.message)
    return NextResponse.json({ error: 'Could not reserve a verification link. Please try again.' }, { status: 500 })
  }

  if (reservation.status === 'no_profile') {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
  }
  if (reservation.status === 'cooldown') {
    return NextResponse.json({ error: 'Please wait a minute before requesting another verification link.' }, { status: 429 })
  }
  if (reservation.status === 'cross_user_pending') {
    return NextResponse.json(
      { error: 'A verification is already pending for this email on another account. Please wait for it to expire (24h) before retrying.' },
      { status: 409 }
    )
  }
  if (reservation.status !== 'reserved') {
    return NextResponse.json({ error: 'Unexpected verification state.' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
  const confirmUrl = new URL('/verify-email', appUrl)
  confirmUrl.searchParams.set('token', token)

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
    // Roll back: mark the reserved token consumed and clear the cooldown so
    // the user can retry immediately rather than wait 60s for a link they
    // never received.
    const { error: rollbackError } = await service.rpc('rollback_student_email_token', {
      p_user_id: user.id,
      p_token_hash: tokenHash,
    })
    if (rollbackError) {
      console.error('student-email send-verification: rollback failed:', rollbackError.message)
    }
    return NextResponse.json({ error: 'Failed to send verification email. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
