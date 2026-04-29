import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SHARE_RATE_LIMIT = 5
const SHARE_RATE_WINDOW_MS = 60_000
const shareRateBuckets = new Map<string, { count: number; resetAt: number }>()

function shareRateKey(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = (request as NextRequest & { ip?: string }).ip ?? forwarded ?? request.headers.get('x-real-ip') ?? 'unknown'
  return `${ip}:${request.nextUrl.pathname}`
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      // Next.js requires unsafe-inline/unsafe-eval; nonce-based CSP would require
      // per-request nonce injection across every page — adopt that separately.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://va.vercel-insights.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://va.vercel-insights.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  )
  return response
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  if (pathname.startsWith('/share/')) {
    const now = Date.now()
    const key = shareRateKey(request)
    const bucket = shareRateBuckets.get(key)

    if (!bucket || bucket.resetAt <= now) {
      shareRateBuckets.set(key, { count: 1, resetAt: now + SHARE_RATE_WINDOW_MS })
    } else if (bucket.count >= SHARE_RATE_LIMIT) {
      const response = NextResponse.json(
        { error: 'Too many share link requests. Try again shortly.' },
        { status: 429 }
      )
      response.headers.set('X-RateLimit-Limit', String(SHARE_RATE_LIMIT))
      response.headers.set('X-RateLimit-Window', String(SHARE_RATE_WINDOW_MS / 1000))
      response.headers.set('X-RateLimit-Remaining', '0')
      response.headers.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)))
      return applySecurityHeaders(response)
    } else {
      bucket.count += 1
    }

    supabaseResponse.headers.set('X-RateLimit-Limit', String(SHARE_RATE_LIMIT))
    supabaseResponse.headers.set('X-RateLimit-Window', String(SHARE_RATE_WINDOW_MS / 1000))
  }

  // Older cached onboarding bundles posted completion JSON to the page route.
  // Rewrite that POST to the API route so users are not blocked by stale assets.
  if (request.method === 'POST' && pathname === '/onboarding') {
    const url = request.nextUrl.clone()
    url.pathname = '/api/onboarding/complete'
    return applySecurityHeaders(NextResponse.rewrite(url))
  }

  // ── Always accessible — bypass auth logic entirely ──────────────────────────
  const alwaysAccessible =
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname.startsWith('/share/') ||
    pathname.startsWith('/api/stripe/webhook') ||
    pathname.startsWith('/api/cron/') ||
    pathname.startsWith('/auth/')

  if (alwaysAccessible) return applySecurityHeaders(supabaseResponse)

  // ── Refresh session — required for Supabase SSR ─────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()

  // ── Routes where unauthenticated access is permitted ────────────────────────
  const unauthAllowed = new Set([
    '/',
    '/login',
    '/signup',
    '/reset-password',
    '/update-password',
  ])
  const isUnauthRoute = unauthAllowed.has(pathname)

  // Not logged in on a protected route → login
  if (!user && !isUnauthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return applySecurityHeaders(NextResponse.redirect(url))
  }

  // Logged in on an unauth-only route → dashboard or onboarding
  if (user && isUnauthRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', user.id)
      .single()

    const url = request.nextUrl.clone()
    url.pathname = profile?.onboarding_complete ? '/dashboard' : '/onboarding'
    return applySecurityHeaders(NextResponse.redirect(url))
  }

  // Logged in on a protected route — enforce onboarding
  if (user && !isUnauthRoute && pathname !== '/onboarding') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', user.id)
      .single()

    if (!profile?.onboarding_complete) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return applySecurityHeaders(NextResponse.redirect(url))
    }
  }

  return applySecurityHeaders(supabaseResponse)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
