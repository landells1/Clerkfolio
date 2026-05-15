import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
  const rl = await checkRateLimit({ key: ip, max: 60, windowSeconds: 60, prefix: 'health' })

  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: rateLimitHeaders(rl, 60),
    })
  }

  const supabase = createServiceClient()

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('DB ping timeout')), 2000)
  )

  try {
    const { error } = await Promise.race([
      supabase.from('profiles').select('id').limit(1),
      timeout,
    ])
    if (error) throw error
  } catch {
    return NextResponse.json({ ok: false, db: 'error', time: new Date().toISOString() }, { status: 503 })
  }

  return NextResponse.json({ ok: true, db: 'ok', time: new Date().toISOString() })
}
