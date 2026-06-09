import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { apiKeyPrefix, generateApiKey, hashApiKey, normalizeApiKeyName } from '@/lib/api-keys'
import { checkRateLimit, isPublicApiOnline, rateLimitHeaders } from '@/lib/rate-limit'

const APIKEY_CREATE_MAX = 5
const APIKEY_CREATE_WINDOW_SECONDS = 60 * 60

function suffixApiKeyName(baseName: string, existingNames: string[]) {
  const used = new Set(existingNames.map(name => name.trim()).filter(Boolean))
  if (!used.has(baseName)) return baseName
  for (let index = 2; index < 100; index++) {
    const candidate = `${baseName} ${index}`
    if (!used.has(candidate)) return candidate
  }
  return `${baseName} ${Date.now()}`
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, prefix, scopes, last_used_at, revoked_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ keys: data ?? [], apiOnline: isPublicApiOnline() })
}

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Don't mint keys that can't authenticate: the public API fails closed with
  // 503 when distributed rate limiting isn't configured, so a new key would be
  // unusable. Enforce this server-side, not just in the UI (QOL-019).
  if (!isPublicApiOnline()) {
    return NextResponse.json(
      { error: 'The developer API is currently offline, so new keys cannot be created yet. Please try again later.' },
      { status: 503 }
    )
  }

  const rateLimit = await checkRateLimit({
    key: user.id,
    max: APIKEY_CREATE_MAX,
    windowSeconds: APIKEY_CREATE_WINDOW_SECONDS,
    prefix: 'apikey-create',
  })
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many API keys created. Wait an hour and try again.' },
      { status: 429, headers: rateLimitHeaders(rateLimit, APIKEY_CREATE_WINDOW_SECONDS) }
    )
  }

  const body = await req.json().catch(() => ({}))
  const fullKey = generateApiKey()
  const baseName = normalizeApiKeyName(body?.name)
  const { data: existingKeys } = await supabase
    .from('api_keys')
    .select('name')
    .eq('user_id', user.id)
  const name = suffixApiKeyName(baseName, (existingKeys ?? []).map(row => row.name))

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: user.id,
      name,
      prefix: apiKeyPrefix(fullKey),
      hash: hashApiKey(fullKey),
      scopes: ['read'],
    })
    .select('id, name, prefix, scopes, last_used_at, revoked_at, created_at')
    .single()

  if (error) {
    const status = error.message.toLowerCase().includes('duplicate') ? 409 : 500
    return NextResponse.json({ error: error.message }, { status })
  }

  return NextResponse.json({ key: fullKey, record: data }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const revokedAt = new Date().toISOString()
  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: revokedAt })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, revoked_at: revokedAt })
}
