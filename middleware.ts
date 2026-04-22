import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  // ── Always accessible — bypass auth logic entirely ──────────────────────────
  // Legal pages, Stripe webhook, auth callbacks. Use exact or prefix matching
  // intentionally (not startsWith('/') which would match everything).
  const alwaysAccessible =
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname.startsWith('/api/stripe/webhook') ||
    pathname.startsWith('/auth/')

  if (alwaysAccessible) return supabaseResponse

  // ── Refresh session — required for Supabase SSR ─────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()

  // ── Routes where unauthenticated access is permitted ────────────────────────
  // Exact matches only — startsWith('/') would match every path.
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
    return NextResponse.redirect(url)
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
    return NextResponse.redirect(url)
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
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
