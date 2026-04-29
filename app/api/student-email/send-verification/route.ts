import { randomBytes, createHash } from 'crypto'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'

const SEND_COOLDOWN_MS = 60 * 1000
const TOKEN_TTL_HOURS = 24

function normaliseEmail(email: unknown) {
  return typeof email === 'string' ? email.trim().toLowerCase().slice(0, 254) : ''
}

function isInstitutionEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.endsWith('.ac.uk')
}

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
    return NextResponse.json({ error: 'Use your university or medical school .ac.uk email address.' }, { status: 400 })
  }

  const service = createServiceClient()
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
  const confirmUrl = new URL('/api/student-email/confirm', req.nextUrl.origin)
  confirmUrl.searchParams.set('token', token)

  const { error: insertError } = await service
    .from('student_email_verification_tokens')
    .insert({
      user_id: user.id,
      email,
      token_hash: tokenHash,
      expires_at: expiresAt,
    })

  if (insertError) {
    return NextResponse.json({ error: 'Could not create verification link.' }, { status: 500 })
  }

  await service
    .from('profiles')
    .update({
      student_email: email,
      student_email_verified: false,
      student_email_verified_at: null,
      student_email_verification_due_at: null,
      student_email_verification_sent_at: now,
    })
    .eq('id', user.id)

  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'Clerkfolio <noreply@clerkfolio.co.uk>',
    to: email,
    subject: 'Verify your Clerkfolio student email',
    text: `Verify your student email for Clerkfolio:\n\n${confirmUrl.toString()}\n\nThis link expires in ${TOKEN_TTL_HOURS} hours.`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #1B6FD9;">Verify your student email</h2>
        <p>Use this link to verify <strong>${htmlEscape(email)}</strong> for Clerkfolio student access.</p>
        <p><a href="${confirmUrl.toString()}" style="display: inline-block; background: #1B6FD9; color: #fff; padding: 10px 16px; border-radius: 8px; text-decoration: none;">Verify student email</a></p>
        <p style="color: #666; font-size: 13px;">This link expires in ${TOKEN_TTL_HOURS} hours.</p>
      </div>
    `,
  })

  return NextResponse.json({ ok: true })
}
