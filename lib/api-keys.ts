import { createHash, randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export type ApiKeyRow = {
  id: string
  user_id: string
  name: string
  prefix: string
  scopes: string[] | null
  revoked_at: string | null
}

export function generateApiKey() {
  return `cfk_${randomBytes(32).toString('base64url')}`
}

export function apiKeyPrefix(key: string) {
  return key.slice(0, 8)
}

export function hashApiKey(key: string) {
  return createHash('sha256').update(key).digest('hex')
}

export function normalizeApiKeyName(value: unknown) {
  const name = typeof value === 'string' ? value.trim() : ''
  return (name || 'Read-only key').slice(0, 80)
}

function bearerToken(req: NextRequest) {
  const header = req.headers.get('authorization') ?? ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? ''
}

function clientIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
}

// Best-effort per-IP rate limit on bearer-key auth. Each lambda has its own
// counter (see app/api/feedback/route.ts for the same caveat) — adequate for
// slowing brute-force probing of key prefixes; replace with a shared store
// (Upstash) once API-key traffic is non-trivial.
const RL_KEY = '__clerkfolio_apikey_rate_limit__'
const rlScope = globalThis as Record<string, unknown>
const rlMap: Map<string, { count: number; resetAt: number }> =
  (rlScope[RL_KEY] as Map<string, { count: number; resetAt: number }>) ??
  (rlScope[RL_KEY] = new Map())
const RL_MAX = 60          // 60 requests
const RL_WINDOW_MS = 60_000 // per minute, per IP

function isRateLimited(ip: string) {
  const now = Date.now()
  const entry = rlMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rlMap.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS })
    return false
  }
  if (entry.count >= RL_MAX) return true
  entry.count++
  return false
}

export async function authenticateApiKey(req: NextRequest): Promise<
  | { supabase: ReturnType<typeof createServiceClient>; key: ApiKeyRow }
  | { response: NextResponse }
> {
  if (isRateLimited(clientIp(req))) {
    return {
      response: NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      ),
    }
  }

  const token = bearerToken(req)
  if (!token) {
    return { response: NextResponse.json({ error: 'Bearer API key required' }, { status: 401 }) }
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, name, prefix, scopes, revoked_at')
    .eq('hash', hashApiKey(token))
    .is('revoked_at', null)
    .maybeSingle()

  if (error) {
    return { response: NextResponse.json({ error: error.message }, { status: 500 }) }
  }
  if (!data) {
    return { response: NextResponse.json({ error: 'Invalid API key' }, { status: 401 }) }
  }
  if (!((data.scopes ?? []).includes('read'))) {
    return { response: NextResponse.json({ error: 'API key is not scoped for reads' }, { status: 403 }) }
  }

  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return { supabase, key: data as ApiKeyRow }
}
