import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { getSubscriptionInfo } from '@/lib/subscription'

// POST /api/share — create a share link for a specialty
export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { specialty_key } = body

  if (!specialty_key || typeof specialty_key !== 'string') {
    return NextResponse.json({ error: 'specialty_key is required' }, { status: 400 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('trial_started_at, subscription_status, subscription_period_end')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (!getSubscriptionInfo(profile).isPro) {
    return NextResponse.json({ error: 'Clinidex Pro is required to create share links' }, { status: 403 })
  }

  // Verify the user actually tracks this specialty
  const { data: app } = await supabase
    .from('specialty_applications')
    .select('id')
    .eq('user_id', user.id)
    .eq('specialty_key', specialty_key)
    .eq('is_active', true)
    .single()

  if (!app) {
    return NextResponse.json({ error: 'Specialty not tracked' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('share_links')
    .insert({
      user_id: user.id,
      specialty_key,
      // expires_at defaults to now() + 30 days in schema
    })
    .select('id, token, specialty_key, expires_at, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/share?id=<linkId> — revoke a share link
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
    .update({ revoked: true })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// GET /api/share — list active share links for the current user
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('share_links')
    .select('id, token, specialty_key, expires_at, revoked, created_at')
    .eq('user_id', user.id)
    .eq('revoked', false)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
