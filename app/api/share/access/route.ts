import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyPin } from '@/lib/share/pin'
import { buildAutoRevokeEmail } from '@/lib/notifications/email-templates'
import { getSpecialtyConfig } from '@/lib/specialties'

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
  return getSpecialtyConfig(tag)?.name ?? tag
}

// Tokens are produced by createShareToken() = randomBytes(24).toString('hex') = 48 hex chars.
// Reject malformed tokens at the edge so we don't burn a DB lookup on every junk request.
const TOKEN_FORMAT = /^[0-9a-f]{48}$/

export async function POST(req: NextRequest) {
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

  if (link.pin_hash && !pin) {
    await supabase.from('share_access_attempts').insert({ share_link_id: link.id, ip_hash: ipHash, success: false })
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
    .select('id, title, date, category, specialty_tags, interview_themes, created_at, updated_at')
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
    supabase.rpc('increment_share_link_view_count', { p_link_id: link.id }),
    supabase.from('audit_log').insert({
      user_id: link.user_id,
      action: 'share_link_viewed',
      metadata: { share_link_id: link.id, scope: link.scope },
    }),
  ])

  return NextResponse.json({
    ownerName: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Clerkfolio user',
    scope: link.scope,
    specialtyKey: link.specialty_key,
    specialtyLabel: link.specialty_key ? formatTag(link.specialty_key) : null,
    themeSlug: link.theme_slug,
    expiresAt: link.expires_at,
    entries: (entries ?? []).map(entry => ({
      ...entry,
      specialty_tag_labels: (entry.specialty_tags ?? []).map(formatTag),
    })),
  })
}
