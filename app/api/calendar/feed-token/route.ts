import { createHash, randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

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
    .select('calendar_feed_token_hash')
    .eq('id', user.id)
    .single()

  if (profile?.calendar_feed_token_hash && !rotate) {
    return NextResponse.json({ error: 'Calendar feed token cannot be shown again. Rotate it to copy a fresh link.', requiresRotation: true }, { status: 409 })
  }

  const token = randomBytes(24).toString('hex')
  const { error } = await supabase
    .from('profiles')
    .update({ calendar_feed_token_hash: hashToken(token), calendar_feed_token: null })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ token })
}
