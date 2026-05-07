import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { fetchSubscriptionInfo } from '@/lib/subscription'
import { createShareToken, hashPin, normalizePin } from '@/lib/share/pin'

type ShareScope = 'specialty' | 'theme' | 'full'

function validScope(value: unknown): value is ShareScope {
  return value === 'specialty' || value === 'theme' || value === 'full'
}

function parseExpiry(value: unknown) {
  if (typeof value !== 'string' || !value) {
    const fallback = new Date()
    fallback.setDate(fallback.getDate() + 30)
    return fallback.toISOString()
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  const now = Date.now()
  const max = new Date()
  max.setDate(max.getDate() + 90)

  if (parsed.getTime() <= now || parsed.getTime() > max.getTime()) return null
  return parsed.toISOString()
}

// Hosts that resolve to private network space or cloud-metadata endpoints —
// blocking these by hostname stops the most common SSRF abuse paths even
// though we don't resolve DNS here. The fetch path also enforces https:
// in production via the protocol check below.
const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./,            // link-local (cloud metadata)
  /^0\./,
  /^\[::1\]?$/,
  /^\[fc[0-9a-f]{2}:/i,     // IPv6 ULA
  /^\[fe80:/i,              // IPv6 link-local
  /\.internal$/i,
  /\.local$/i,
]

function parseWebhookUrl(value: unknown) {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return { url: null as string | null }
  if (raw.length > 2048) return { error: 'Webhook URL is too long.' }

  try {
    const url = new URL(raw)
    // Require https in production. http is allowed in dev for local testing.
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      return { error: 'Webhook URL must use https://.' }
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return { error: 'Webhook URL must start with http:// or https://.' }
    }
    const host = url.hostname
    if (PRIVATE_HOST_PATTERNS.some(pattern => pattern.test(host))) {
      return { error: 'Webhook URL must point to a public host.' }
    }
    return { url: url.toString() }
  } catch {
    return { error: 'Enter a valid webhook URL.' }
  }
}

async function verifyShareScope(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  scope: ShareScope,
  specialtyKey: string | null,
  themeSlug: string | null
) {
  if (scope === 'full') return null

  if (scope === 'specialty') {
    if (!specialtyKey) return 'Choose a specialty to share.'
    const { data } = await supabase
      .from('specialty_applications')
      .select('id')
      .eq('user_id', userId)
      .eq('specialty_key', specialtyKey)
      .eq('is_active', true)
      .maybeSingle()
    return data ? null : 'Specialty not tracked.'
  }

  if (!themeSlug) return 'Choose a theme to share.'
  return null
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('share_links')
    .select('id, token, specialty_key, theme_slug, scope, expires_at, view_count, hide_notes, hide_reflection, redact_tags, view_webhook_url, revoked_at, created_at')
    .eq('user_id', user.id)
    .eq('revoked', false)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const scope = validScope(body.scope) ? body.scope : 'specialty'
  const specialtyKey = typeof body.specialty_key === 'string' && body.specialty_key.trim()
    ? body.specialty_key.trim()
    : null
  const themeSlug = typeof body.theme_slug === 'string' && body.theme_slug.trim()
    ? body.theme_slug.trim()
    : null
  const expiry = parseExpiry(body.expires_at)
  const pin = normalizePin(body.pin)
  const webhook = parseWebhookUrl(body.view_webhook_url)

  if (!expiry) {
    return NextResponse.json({ error: 'Expiry must be between tomorrow and 90 days from now.' }, { status: 400 })
  }
  if ('error' in webhook) {
    return NextResponse.json({ error: webhook.error }, { status: 400 })
  }

  const scopeError = await verifyShareScope(supabase, user.id, scope, specialtyKey, themeSlug)
  if (scopeError) return NextResponse.json({ error: scopeError }, { status: 400 })

  const subInfo = await fetchSubscriptionInfo(supabase, user.id)
  if (!subInfo.limits.canCreateShareLink) {
    return NextResponse.json(
      { error: 'limit_reached', limit: 1, used: subInfo.usage.shareLinksUsed, upgrade_url: '/upgrade' },
      { status: 403 }
    )
  }

  const { data, error } = await supabase
    .from('share_links')
    .insert({
      user_id: user.id,
      token: createShareToken(),
      scope,
      specialty_key: scope === 'specialty' ? specialtyKey : null,
      theme_slug: scope === 'theme' ? themeSlug : null,
      expires_at: expiry,
      pin_hash: pin ? hashPin(pin) : null,
      hide_notes: body.hide_notes === true,
      hide_reflection: body.hide_reflection === true,
      redact_tags: body.redact_tags === true,
      view_webhook_url: webhook.url,
      revoked: false,
      revoked_at: null,
    })
    .select('id, token, specialty_key, theme_slug, scope, expires_at, view_count, hide_notes, hide_reflection, redact_tags, view_webhook_url, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!subInfo.isPro) {
    await supabase.rpc('increment_pro_feature_usage', {
      p_user_id: user.id,
      p_feature: 'share_links_used',
    })

    // Compensating check: race condition where two concurrent requests both
    // pass the pre-insert limit check. Count actual active links and revoke
    // the just-created one if we're now over the free limit.
    const { count: actualCount } = await supabase
      .from('share_links')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())

    if ((actualCount ?? 0) > 1) {
      await supabase.from('share_links').delete().eq('id', data.id)
      return NextResponse.json(
        { error: 'limit_reached', limit: 1, used: actualCount, upgrade_url: '/upgrade' },
        { status: 403 }
      )
    }
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await createServiceClient().from('audit_log').insert({
      user_id: user.id,
      action: 'share_link_generated',
      metadata: { share_link_id: data.id, scope },
    })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const id = typeof body.id === 'string' ? body.id : ''
  const days = Number.isFinite(Number(body.days)) ? Math.min(Math.max(Number(body.days), 1), 90) : 30
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const nextExpiry = new Date()
  nextExpiry.setDate(nextExpiry.getDate() + days)

  const { data: existing, error: existingError } = await supabase
    .from('share_links')
    .select('revoked, revoked_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })
  if (!existing) return NextResponse.json({ error: 'Share link not found.' }, { status: 404 })
  if (existing.revoked || existing.revoked_at) {
    return NextResponse.json(
      { error: 'This link was revoked and cannot be extended. Create a new share link.' },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from('share_links')
    .update({ expires_at: nextExpiry.toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, expires_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('share_links')
    .update({ revoked_at: new Date().toISOString(), revoked: true })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
