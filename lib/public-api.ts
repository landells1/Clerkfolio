import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { authenticateApiKey } from '@/lib/api-keys'

export type PublicApiResource = 'cases' | 'portfolio' | 'specialties' | 'deadlines' | 'goals'

type PublicQuery = (
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
) => Promise<{ data: unknown; error: { message: string } | null }>

const QUERIES: Record<PublicApiResource, PublicQuery> = {
  cases: async (supabase, userId) =>
    await supabase
      .from('cases')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('date', { ascending: false }),
  portfolio: async (supabase, userId) =>
    await supabase
      .from('portfolio_entries')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('date', { ascending: false }),
  specialties: async (supabase, userId) =>
    await supabase
      .from('specialty_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  deadlines: async (supabase, userId) =>
    await supabase
      .from('deadlines')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true }),
  goals: async (supabase, userId) =>
    await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
}

export async function handlePublicApiResource(req: NextRequest, resource: PublicApiResource) {
  const auth = await authenticateApiKey(req)
  if ('response' in auth) return auth.response

  const { data, error } = await QUERIES[resource](auth.supabase, auth.key.user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: data ?? [],
    meta: {
      resource,
      generated_at: new Date().toISOString(),
      key_prefix: auth.key.prefix,
    },
  })
}

export function publicApiMethodNotAllowed() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'GET' } }
  )
}
