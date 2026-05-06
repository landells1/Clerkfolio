import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { apiKeyPrefix, generateApiKey, hashApiKey, normalizeApiKeyName } from '@/lib/api-keys'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, prefix, scopes, last_used_at, revoked_at, created_at')
    .eq('user_id', user.id)
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

  const body = await req.json().catch(() => ({}))
  const fullKey = generateApiKey()
  const name = normalizeApiKeyName(body?.name)

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

  const supabase = createClient()
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
