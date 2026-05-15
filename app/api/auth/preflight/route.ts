import { NextRequest, NextResponse } from 'next/server'
import { validateOrigin } from '@/lib/csrf'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'

// Pre-flight rate-limit for unauthenticated auth flows that the Supabase
// client invokes directly from the browser (signup, password reset).
//
// Supabase Auth has its own rate limiting at the project level, but it is
// per-project and resets every hour. This layer adds per-IP throttling that:
//  - bounds referral-code abuse via mass signup (HIGH-005),
//  - bounds inbox-bomb-style password-reset spam against a target email.
//
// The client calls this BEFORE invoking supabase.auth.* and aborts on 429.
// A determined attacker can bypass it by hitting the Supabase endpoint
// directly - that's still capped by Supabase Auth - but the easy abuse paths
// (running the client form a thousand times) are gone.

type Action = 'signup' | 'reset' | 'login'

const LIMITS: Record<Action, { max: number; windowSeconds: number; prefix: string }> = {
  signup: { max: 5, windowSeconds: 60 * 60, prefix: 'auth-signup' },
  reset: { max: 3, windowSeconds: 60 * 60, prefix: 'auth-reset' },
  login: { max: 20, windowSeconds: 60 * 60, prefix: 'auth-login' },
}

function clientIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
}

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const body = await req.json().catch(() => null)
  const action = body?.action as Action
  if (action !== 'signup' && action !== 'reset' && action !== 'login') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const limit = LIMITS[action]
  const rl = await checkRateLimit({
    key: clientIp(req),
    max: limit.max,
    windowSeconds: limit.windowSeconds,
    prefix: limit.prefix,
  })

  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before trying again.' },
      { status: 429, headers: rateLimitHeaders(rl, limit.windowSeconds) }
    )
  }

  return NextResponse.json({ ok: true }, { headers: rateLimitHeaders(rl, limit.windowSeconds) })
}
