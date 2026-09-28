import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { validateOrigin } from '@/lib/csrf'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { requestIp } from '@/lib/request-ip'

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
  // Per email address (signup/reset) or per IP + email (login).
  signup: { max: 5, windowSeconds: 60 * 60, prefix: 'auth-signup' },
  reset: { max: 3, windowSeconds: 60 * 60, prefix: 'auth-reset' },
  login: { max: 20, windowSeconds: 60 * 60, prefix: 'auth-login' },
}

// Looser per-network ceilings. A per-IP-only limit of 5 signups/hour blocked
// a med-school cohort or ward team signing up together on one eduroam / NHS
// Wi-Fi NAT address; the tight limit now keys on the email address instead,
// and this bounds mass signups/resets from a single network.
const NETWORK_LIMITS: Record<'signup' | 'reset', { max: number; windowSeconds: number; prefix: string }> = {
  signup: { max: 40, windowSeconds: 60 * 60, prefix: 'auth-signup-net' },
  reset: { max: 30, windowSeconds: 60 * 60, prefix: 'auth-reset-net' },
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
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (action === 'login' && !email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }
  // Prevent one account's attempts from blocking other users sharing a
  // hospital or university network.
  const account = email
    ? createHash('sha256').update(email).digest('hex')
    : ''
  const ip = requestIp(req)

  if (action !== 'login') {
    const network = NETWORK_LIMITS[action]
    const networkRl = await checkRateLimit({ key: ip, ...network })
    if (!networkRl.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429, headers: rateLimitHeaders(networkRl, network.windowSeconds) }
      )
    }
  }

  const rl = await checkRateLimit({
    // login: IP + account; signup/reset: the account alone (bounds inbox
    // bombing of one address from any IP), falling back to IP for old
    // cached clients that don't send the email yet.
    key: action === 'login' ? `${ip}:${account}` : (account || ip),
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
