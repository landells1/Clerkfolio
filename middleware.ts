import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { requestIp } from '@/lib/request-ip'
import { isProtectedPagePath } from '@/lib/auth/protected-paths'

function contentSecurityPolicy(nonce: string): string {
  return [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''} https://js.stripe.com https://va.vercel-insights.com`,
      // Dynamic style attributes are used throughout the dashboard for charts,
      // progress bars and positioned UI. Moving these to nonce-aware styles is
      // a separate migration; script execution is the higher-risk CSP control.
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com",
      // Sentry browser SDK posts events to *.ingest.de.sentry.io for the
      // EU-region project (see instrumentation-client.ts → NEXT_PUBLIC_SENTRY_DSN).
      // Without this entry the CSP silently blocks every client-side capture.
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://va.vercel-insights.com https://*.ingest.de.sentry.io https://*.ingest.sentry.io",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
}

function applySecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Content-Security-Policy', contentSecurityPolicy(nonce))
  return response
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

// Decode a Supabase access-token JWT and pull the `session_id` claim.
// Edge runtime: atob is available. We never trust this token (it's not the
// auth check; supabase.auth.getUser handles that). We only use the session_id
// for fingerprint scoping, so a malformed JWT just falls back to null and the
// row keys on (user_id, ip_hash, user_agent) like before.
function readSessionId(token: string | undefined): string | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(atob(payload + '='.repeat((4 - payload.length % 4) % 4)))
    return typeof decoded?.session_id === 'string' ? decoded.session_id : null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID()).replace(/=+$/, '')
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy(nonce))
  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { pathname } = request.nextUrl
  const host = request.headers.get('host') ?? ''

  if (host.endsWith('.clerkfolio.site')) {
    const slug = host.split('.')[0]
    if (slug && slug !== 'www') {
      const url = request.nextUrl.clone()
      url.pathname = `/showcase/${slug}`
      return applySecurityHeaders(NextResponse.rewrite(url, { request: { headers: requestHeaders } }), nonce)
    }
  }

  // Older cached onboarding bundles posted completion JSON to the page route.
  // Rewrite that POST to the API route so users are not blocked by stale assets.
  if (request.method === 'POST' && pathname === '/onboarding') {
    const url = request.nextUrl.clone()
    url.pathname = '/api/onboarding/complete'
    return applySecurityHeaders(NextResponse.rewrite(url, { request: { headers: requestHeaders } }), nonce)
  }

  // ── Always accessible - bypass auth logic entirely ──────────────────────────
  const alwaysAccessible =
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname === '/cookies' ||
    pathname === '/dpa' ||
    pathname === '/subprocessors' ||
    pathname === '/security' ||
    pathname === '/contact' ||
    pathname === '/offline' ||
    pathname.startsWith('/share/') ||
    pathname.startsWith('/showcase/') ||
    pathname.startsWith('/api/share/access') ||
    pathname.startsWith('/api/calendar/feed/') ||
    pathname.startsWith('/api/stripe/webhook') ||
    pathname.startsWith('/api/student-email/confirm') ||
    pathname.startsWith('/api/feedback') ||
    pathname.startsWith('/api/cron/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/r/')

  if (alwaysAccessible) return applySecurityHeaders(supabaseResponse, nonce)

  // ── Refresh session - required for Supabase SSR ─────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()

  if (user && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SHARE_IP_HASH_SALT) {
    // Supabase access-token's `session_id` claim identifies the specific
    // Supabase session this browser holds. Tracking it on the fingerprint row
    // means a revoke targets one session, not every future login from the
    // same browser/IP/user-agent triple. Falls back to fingerprint-only if
    // the JWT cannot be decoded. getSession reads cookies only - no network.
    const { data: sessionData } = await supabase.auth.getSession()
    const sessionId = readSessionId(sessionData?.session?.access_token)

    // Throttle fingerprint maintenance to once per FP_SEEN_MAX_AGE_SECONDS per
    // session. Unthrottled, this block added 3-5 serial service-role
    // round-trips plus a last_seen_at write to every authenticated
    // navigation - the largest controllable latency cost on the dashboard hot
    // path. The cookie is scoped to the session id so a re-login (new session)
    // re-runs maintenance immediately. Trade-offs, both accepted: session
    // revocation now takes effect within 5 minutes instead of instantly, and a
    // client that forges the cookie only sidesteps this defense-in-depth layer
    // - Supabase token revocation/expiry still applies.
    const FP_SEEN_MAX_AGE_SECONDS = 5 * 60
    const fpScope = sessionId ?? user.id
    const fpSeen = request.cookies.get('cf_fp_seen')?.value === fpScope

    if (!fpSeen) {
      const admin = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { cookies: { getAll: () => [], setAll: () => {} } }
      )
      const userAgent = request.headers.get('user-agent') ?? 'unknown'
      const ipHash = await sha256Hex(`${requestIp(request)}:${process.env.SHARE_IP_HASH_SALT}`)

      // Prefer matching on session_id when available. If the session_id matches
      // and the row is revoked, kick the user back to login. If session_id is
      // not yet known to us (fresh login or post-revoke re-login), match on the
      // fingerprint triple but only when revoked_at IS NULL - so a revoked row
      // with the same fingerprint no longer locks the user out forever.
      let existing: { id: string; revoked_at: string | null } | null = null
      if (sessionId) {
        const { data } = await admin
          .from('session_fingerprints')
          .select('id, revoked_at')
          .eq('user_id', user.id)
          .eq('session_id', sessionId)
          .maybeSingle()
        existing = data ?? null
      }
      if (!existing) {
        const { data } = await admin
          .from('session_fingerprints')
          .select('id, revoked_at')
          .eq('user_id', user.id)
          .eq('ip_hash', ipHash)
          .eq('user_agent', userAgent)
          .is('revoked_at', null)
          .is('session_id', null)
          .maybeSingle()
        existing = data ?? null
      }

      if (existing?.revoked_at) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('session', 'revoked')
        return applySecurityHeaders(NextResponse.redirect(url), nonce)
      }

      if (existing?.id) {
        // Backfill session_id on legacy rows the first time we see a JWT.
        const patch: { last_seen_at: string; session_id?: string } = { last_seen_at: new Date().toISOString() }
        if (sessionId) patch.session_id = sessionId
        await admin.from('session_fingerprints').update(patch).eq('id', existing.id)
      } else {
        // Idempotent insert. Two concurrent first-requests for a fresh session
        // both reach here (both passed the SELECT above) and would otherwise
        // race on the partial unique index session_fingerprints_active_uq,
        // logging a `duplicate key` ERROR in Postgres. The RPC does a real
        // INSERT ... ON CONFLICT ... DO NOTHING so the loser is a silent no-op
        // (F-021). service_role-only; supabase-js .upsert() can't target the
        // partial-expression index, hence the helper.
        await admin.rpc('record_active_session_fingerprint', {
          p_user_id: user.id,
          p_ip_hash: ipHash,
          p_user_agent: userAgent,
          p_session_id: sessionId,
        })
      }

      supabaseResponse.cookies.set('cf_fp_seen', fpScope, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: FP_SEEN_MAX_AGE_SECONDS,
      })
    }
  }

  // ── Routes where unauthenticated access is permitted ────────────────────────
  const unauthAllowed = new Set([
    '/',
    '/login',
    '/signup',
    '/reset-password',
    '/update-password',
  ])
  const isUnauthRoute = unauthAllowed.has(pathname)

  // /update-password requires a live session (recovery or regular). Without any
  // session the form would submit and expose a raw JWT error. Redirect to login.
  if (!user && pathname === '/update-password') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return applySecurityHeaders(NextResponse.redirect(url), nonce)
  }

  // Known authenticated page prefixes — only redirect these to /login when
  // there is no session. Unknown routes fall through so Next.js can render its
  // custom 404 page instead of silently bouncing the user to /login. The list
  // lives in one place (`PROTECTED_PAGE_PREFIXES`) shared with the login page's
  // post-login `next` allowlist so the redirect target and the allowlist can't
  // drift apart (F-009).
  const isKnownProtectedPage = isProtectedPagePath(pathname)

  if (!user && isKnownProtectedPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', `${pathname}${request.nextUrl.search}`)
    return applySecurityHeaders(NextResponse.redirect(url), nonce)
  }

  // Single profile fetch covers both redirect paths below
  let onboardingComplete: boolean | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', user.id)
      .single()
    onboardingComplete = profile?.onboarding_complete ?? false
  }

  // /update-password must only be reachable inside a Supabase recovery
  // session, not just any logged-in session. Otherwise a 30-second laptop
  // grab is enough to permanently take over an account: attacker opens
  // /update-password while the victim is logged in and resets the password
  // without a current-password challenge.
  //
  // We use an HTTP-only `cf_recovery` cookie that /auth/callback sets when
  // the recovery code is exchanged and `next=/update-password`. The cookie
  // is short-lived (10 min) and removed by /update-password on successful
  // password change. AMR/JWT claim shape varies across Supabase SDK versions;
  // an app-owned cookie is unambiguous.
  if (user && pathname === '/update-password') {
    const recoveryCookie = request.cookies.get('cf_recovery')
    if (!recoveryCookie?.value) {
      // No recovery cookie -> not a fresh recovery flow. Bounce to the
      // settings page where the user can change their password from a
      // properly-authenticated context, with a banner explaining the bounce.
      const url = request.nextUrl.clone()
      url.pathname = onboardingComplete ? '/settings' : '/onboarding'
      url.searchParams.set('error', 'recovery_required')
      return applySecurityHeaders(NextResponse.redirect(url), nonce)
    }
  }

  // Password reset lands here with a short-lived authenticated recovery session.
  // Do not bounce it away as a normal logged-in auth page.
  if (user && isUnauthRoute && pathname !== '/update-password') {
    const url = request.nextUrl.clone()
    url.pathname = onboardingComplete ? '/dashboard' : '/onboarding'
    return applySecurityHeaders(NextResponse.redirect(url), nonce)
  }

  // Logged in on a protected route - enforce onboarding
  if (user && !isUnauthRoute && pathname !== '/onboarding') {
    if (!onboardingComplete) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return applySecurityHeaders(NextResponse.redirect(url), nonce)
    }
  }

  return applySecurityHeaders(supabaseResponse, nonce)
}

export const config = {
  matcher: [
    // Excludes:
    //  - Next.js build assets and favicon
    //  - sw.js / manifest.webmanifest / manifest.json: PWA service-worker
    //    registration is blocked if these paths return a redirect, so they
    //    must bypass the auth-aware middleware entirely.
    //  - robots.txt / sitemap.xml: Next.js metadata routes generated by
    //    app/robots.ts and app/sitemap.ts. Crawlers must reach the plain text
    //    versions, not a /login HTML redirect.
    //  - Common static image extensions
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|manifest\\.json|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
