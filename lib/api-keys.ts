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

export async function authenticateApiKey(req: NextRequest): Promise<
  | { supabase: ReturnType<typeof createServiceClient>; key: ApiKeyRow }
  | { response: NextResponse }
> {
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
