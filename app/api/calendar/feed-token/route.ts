import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const rotate = Boolean(body?.rotate)

  const { data: profile } = await supabase
    .from('profiles')
    .select('calendar_feed_token')
    .eq('id', user.id)
    .single()

  if (profile?.calendar_feed_token && !rotate) {
    return NextResponse.json({ token: profile.calendar_feed_token })
  }

  const token = randomBytes(24).toString('hex')
  const { error } = await supabase
    .from('profiles')
    .update({ calendar_feed_token: token })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ token })
}
