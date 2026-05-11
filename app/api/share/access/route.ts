import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyPin } from '@/lib/share/pin'
import { buildAutoRevokeEmail } from '@/lib/notifications/email-templates'
import { formatSpecialtyLabel } from '@/lib/specialties'
import { validateOrigin } from '@/lib/csrf'

const ACCESS_RATE_LIMIT = 5

function rawIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
}

function hashIp(req: NextRequest) {
  const ip = rawIp(req)
  const salt = process.env.SHARE_IP_HASH_SALT
  if (!salt) throw new Error('SHARE_IP_HASH_SALT is not configured')
  return createHash('sha256').update(`${ip}:${salt}`).digest('hex')
}

function minutesAgo(minutes: number) {
  const d = new Date()
  d.setMinutes(d.getMinutes() - minutes)
  return d.toISOString()
}

function formatTag(tag: string) {
  return formatSpecialtyLabel(tag)
}

// Defence-in-depth SSRF check: even though parseWebhookUrl in share/route.ts
// blocks private hosts at insert time, legacy rows may have been stored before
// that check was added. Re-validate here before the service-role process makes
// an outbound request.
const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i, /^127\./, /^10\./, /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./, /^169\.254\./, /^0\./,
  /^\[::1\]?$/, /^\[fc[0-9a-f]{2}:/i, /^\[fe80:/i,
  /\.internal$/i, /\.local$/i,
]

async function sendShareViewWebhook(
  url: string,
  payload: { token: string; scope: string; viewed_at: string; ip_hash: string }
) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return
    if (PRIVATE_HOST_PATTERNS.some(pattern => pattern.test(parsed.hostname))) return

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    try {
      await fetch(parsed.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }
  } catch (err) {
    console.error('share view webhook failed:', err)
  }
}

// Tokens are produced by createShareToken() = randomBytes(24).toString('hex') = 48 hex chars,
// but the DB column default is encode(gen_random_bytes(32), 'hex') = 64 hex chars. Accept either
// length so direct DB inserts (e.g. tests, admin tooling) are not silently rejected at the edge.
// Reject malformed tokens here so we don't burn a DB lookup on every junk request.
const TOKEN_FORMAT = /^[0-9a-f]{48}$|^[0-9a-f]{64}$/

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = createServiceClient()
  const body = await req.json().catch(() => null)
  const token = typeof body?.token === 'string' ? body.token : ''
  const pin = typeof body?.pin === 'string' ? body.pin.trim() : ''

  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })
  if (!TOKEN_FORMAT.test(token)) {
    return NextResponse.json({ error: 'This share link is no longer available.' }, { status: 404 })
  }

  const { data: link, error } = await supabase
    .from('share_links')
    .select('id, user_id, token, scope, specialty_key, theme_slug, expires_at, revoked, revoked_at, pin_hash, view_count, hide_notes, hide_reflection, redact_tags, view_webhook_url, created_at')
    .eq('token', token)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!link || link.revoked || link.revoked_at) {
    return NextResponse.json({ error: 'This share link is no longer available.' }, { status: 404 })
  }
  if (new Date(link.expires_at).getTime() < Date.now()) {
    await supabase.from('share_links').update({ revoked_at: new Date().toISOString(), revoked: true }).eq('id', link.id)
    return NextResponse.json({ error: 'This share link has expired.' }, { status: 410 })
  }

  let ipHash: string
  try {
    ipHash = hashIp(req)
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Share access is temporarily unavailable.' }, { status: 503 })
  }

  const { count: recentAttempts } = await supabase
    .from('share_access_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('share_link_id', link.id)
    .eq('ip_hash', ipHash)
    .gte('created_at', minutesAgo(1))

  if ((recentAttempts ?? 0) >= ACCESS_RATE_LIMIT) {
    return NextResponse.json(
      { error: 'Too many share link requests. Try again shortly.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(ACCESS_RATE_LIMIT),
          'X-RateLimit-Window': '60',
          'Retry-After': '60',
        },
      }
    )
  }

  const { count: failedAttempts } = await supabase
    .from('share_access_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('share_link_id', link.id)
    .eq('ip_hash', ipHash)
    .eq('success', false)
    .gte('created_at', minutesAgo(15))

  if ((failedAttempts ?? 0) >= 10) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  // First page load asks "is a PIN needed?" with no pin in the body.
  // Don't count that probe as a failed attempt - it's not a real guess and
  // it burns through the 10-attempt budget before the user types anything.
  if (link.pin_hash && !pin) {
    return NextResponse.json({ pinRequired: true }, { status: 401 })
  }
  if (link.pin_hash && !verifyPin(pin, link.pin_hash)) {
    await supabase.from('share_access_attempts').insert({ share_link_id: link.id, ip_hash: ipHash, success: false })
    const used = (failedAttempts ?? 0) + 1
    const remaining = Math.max(0, 10 - used)
    const message = remaining > 0
      ? `Incorrect PIN. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining before a 15-minute lockout.`
      : 'Too many incorrect attempts. Try again in 15 minutes.'
    return NextResponse.json({ error: message, pinRequired: true }, { status: 403 })
  }

  const { count: recentViews } = await supabase
    .from('share_views')
    .select('id', { count: 'exact', head: true })
    .eq('share_link_id', link.id)
    .gte('viewed_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

  if ((recentViews ?? 0) >= 100) {
    await supabase.from('share_links').update({ revoked_at: new Date().toISOString(), revoked: true }).eq('id', link.id)
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('first_name, notification_preferences')
      .eq('id', link.user_id)
      .maybeSingle()

    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(link.user_id)
        if (userData?.user?.email) {
          const resend = new Resend(resendKey)
          await resend.emails.send({
            from: 'Clerkfolio <noreply@clerkfolio.co.uk>',
            to: userData.user.email,
            subject: 'Your shared portfolio link was auto-revoked',
            html: buildAutoRevokeEmail({
              userName: ownerProfile?.first_name ?? 'there',
              linkScope: link.scope,
              viewCount: 100,
            }),
          })
        }
      } catch (err) {
        console.error('auto-revoke email failed:', err)
      }
    }
    return NextResponse.json({ error: 'This share link has been paused after unusual traffic.' }, { status: 429 })
  }

  let query = supabase
    .from('portfolio_entries')
    .select('id, title, date, category, specialty_tags, interview_themes, notes, refl_free_text, created_at, updated_at')
    .eq('user_id', link.user_id)
    .is('deleted_at', null)
    .order('date', { ascending: false })

  if (link.scope === 'specialty' && link.specialty_key) {
    query = query.contains('specialty_tags', [link.specialty_key])
  }
  if (link.scope === 'theme' && link.theme_slug) {
    query = query.contains('interview_themes', [link.theme_slug])
  }

  const [{ data: profile }, { data: entries, error: entriesError }] = await Promise.all([
    supabase.from('profiles').select('first_name, last_name').eq('id', link.user_id).maybeSingle(),
    query,
  ])

  if (entriesError) return NextResponse.json({ error: entriesError.message }, { status: 500 })

  const viewedAt = new Date().toISOString()
  const { error: viewError } = await supabase
    .from('share_views')
    .insert({ share_link_id: link.id, ip_hash: ipHash, viewed_at: viewedAt })

  await Promise.allSettled([
    supabase.from('share_access_attempts').insert({ share_link_id: link.id, ip_hash: ipHash, success: true }),
    supabase.rpc('increment_share_link_view_count', { p_link_id: link.id }),
    supabase.from('audit_log').insert({
      user_id: link.user_id,
      action: 'share_link_viewed',
      metadata: { share_link_id: link.id, scope: link.scope },
    }),
  ])

  if (!viewError && link.view_webhook_url) {
    await sendShareViewWebhook(link.view_webhook_url, {
      token: link.token,
      scope: link.scope,
      viewed_at: viewedAt,
      ip_hash: ipHash,
    })
  }

  return NextResponse.json({
    ownerName: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Clerkfolio user',
    scope: link.scope,
    specialtyKey: link.specialty_key,
    specialtyLabel: link.specialty_key ? formatTag(link.specialty_key) : null,
    themeSlug: link.theme_slug,
    expiresAt: link.expires_at,
    entries: (entries ?? []).map(entry => ({
      ...entry,
      notes: link.hide_notes ? null : entry.notes,
      refl_free_text: link.hide_reflection ? null : entry.refl_free_text,
      specialty_tags: link.redact_tags ? [] : entry.specialty_tags,
      specialty_tag_labels: link.redact_tags ? [] : (entry.specialty_tags ?? []).map(formatTag),
    })),
    watermark: link.pin_hash ? 'PIN-protected viewer' : null,
  })
}
