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
    .select('id, token, specialty_key, theme_slug, scope, expires_at, view_count, revoked_at, created_at')
    .eq('user_id', user.id)
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

  if (!expiry) {
    return NextResponse.json({ error: 'Expiry must be between tomorrow and 90 days from now.' }, { status: 400 })
  }

  const scopeError = await verifyShareScope(supabase, user.id, scope, specialtyKey, themeSlug)
  if (scopeError) return NextResponse.json({ error: scopeError }, { status: 400 })

  const subInfo = await fetchSubscriptionInfo(supabase, user.id)
  if (!subInfo.limits.canCreateShareLink) {
    return NextResponse.json(
      { error: 'You have used your free share link. Upgrade to Pro to create more.' },
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
      revoked: false,
      revoked_at: null,
    })
    .select('id, token, specialty_key, theme_slug, scope, expires_at, view_count, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!subInfo.isPro) {
    await supabase.from('profiles').update({
      pro_features_used: {
        pdf_exports_used: subInfo.usage.pdfExportsUsed,
        share_links_used: subInfo.usage.shareLinksUsed + 1,
        referral_pro_until: subInfo.usage.referralProUntil,
      },
    }).eq('id', user.id)
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

  const { data, error } = await supabase
    .from('share_links')
    .update({ expires_at: nextExpiry.toISOString(), revoked_at: null, revoked: false })
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
