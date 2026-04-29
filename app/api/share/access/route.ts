import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyPin } from '@/lib/share/pin'
import { buildAutoRevokeEmail } from '@/lib/notifications/email-templates'

const ACCESS_RATE_LIMIT = 5
const ACCESS_RATE_WINDOW_MS = 60_000
const accessRateBuckets = new Map<string, { count: number; resetAt: number }>()

function rawIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
}

function hashIp(req: NextRequest) {
  const ip = rawIp(req)
  return createHash('sha256').update(`${ip}:${process.env.SHARE_IP_HASH_SALT ?? ''}`).digest('hex')
}

function startOfHour() {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  return d.toISOString()
}

function minutesAgo(minutes: number) {
  const d = new Date()
  d.setMinutes(d.getMinutes() - minutes)
  return d.toISOString()
}

export async function POST(req: NextRequest) {
  const now = Date.now()
  const rateKey = rawIp(req)
  const bucket = accessRateBuckets.get(rateKey)
  if (!bucket || bucket.resetAt <= now) {
    accessRateBuckets.set(rateKey, { count: 1, resetAt: now + ACCESS_RATE_WINDOW_MS })
  } else if (bucket.count >= ACCESS_RATE_LIMIT) {
    return NextResponse.json(
      { error: 'Too many share link requests. Try again shortly.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(ACCESS_RATE_LIMIT),
          'X-RateLimit-Window': String(ACCESS_RATE_WINDOW_MS / 1000),
          'Retry-After': String(Math.ceil((bucket.resetAt - now) / 1000)),
        },
      }
    )
  } else {
    bucket.count += 1
  }

  const supabase = createServiceClient()
  const body = await req.json()
  const token = typeof body.token === 'string' ? body.token : ''
  const pin = typeof body.pin === 'string' ? body.pin.trim() : ''

  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const { data: link, error } = await supabase
    .from('share_links')
    .select('id, user_id, token, scope, specialty_key, theme_slug, expires_at, revoked, revoked_at, pin_hash, view_count, created_at')
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

  const ipHash = hashIp(req)
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

  if (link.pin_hash && !pin) {
    return NextResponse.json({ pinRequired: true }, { status: 401 })
  }
  if (link.pin_hash && !verifyPin(pin, link.pin_hash)) {
    await supabase.from('share_access_attempts').insert({ share_link_id: link.id, ip_hash: ipHash, success: false })
    return NextResponse.json({ error: 'Incorrect PIN.' }, { status: 403 })
  }

  const { count: recentViews } = await supabase
    .from('share_views')
    .select('id', { count: 'exact', head: true })
    .eq('share_link_id', link.id)
    .gte('viewed_at', startOfHour())

  if ((recentViews ?? 0) >= 100) {
    await supabase.from('share_links').update({ revoked_at: new Date().toISOString(), revoked: true }).eq('id', link.id)
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('first_name, notification_preferences')
      .eq('id', link.user_id)
      .maybeSingle()

    const prefs = (ownerProfile?.notification_preferences ?? {}) as { share_link_expiring?: boolean }
    const resendKey = process.env.RESEND_API_KEY
    if (prefs.share_link_expiring !== false && resendKey) {
      const { data: userData } = await supabase.auth.admin.getUserById(link.user_id)
      if (userData?.user?.email) {
        const resend = new Resend(resendKey)
        await resend.emails.send({
          from: 'Clinidex <noreply@clinidex.co.uk>',
          to: userData.user.email,
          subject: 'Your shared portfolio link was auto-revoked',
          html: buildAutoRevokeEmail({
            userName: ownerProfile?.first_name ?? 'there',
            linkScope: link.scope,
            viewCount: 100,
          }),
        })
      }
    }
    return NextResponse.json({ error: 'This share link has been paused after unusual traffic.' }, { status: 429 })
  }

  let query = supabase
    .from('portfolio_entries')
    .select('id, title, date, category, specialty_tags, interview_themes, notes, created_at, updated_at')
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

  await Promise.allSettled([
    supabase.from('share_access_attempts').insert({ share_link_id: link.id, ip_hash: ipHash, success: true }),
    supabase.from('share_views').insert({ share_link_id: link.id, ip_hash: ipHash }),
    supabase.from('share_links').update({ view_count: (link.view_count ?? 0) + 1 }).eq('id', link.id),
    supabase.from('audit_log').insert({
      user_id: link.user_id,
      action: 'share_link_viewed',
      metadata: { share_link_id: link.id, scope: link.scope },
    }),
  ])

  return NextResponse.json({
    ownerName: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Clinidex user',
    scope: link.scope,
    specialtyKey: link.specialty_key,
    themeSlug: link.theme_slug,
    expiresAt: link.expires_at,
    entries: entries ?? [],
  })
}
