import { NextRequest, NextResponse } from 'next/server'

function normaliseOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined
  // Strip trailing slash so NEXT_PUBLIC_APP_URL=https://clerkfolio.co.uk/
  // and https://clerkfolio.co.uk both match.
  return value.replace(/\/+$/, '')
}

const ALLOWED_ORIGINS = new Set(
  [
    normaliseOrigin(process.env.NEXT_PUBLIC_APP_URL),
    'https://clerkfolio.co.uk',
    'https://www.clerkfolio.co.uk',
    // clerkfolio.vercel.app removed: not a production host and accepting it
    // widens the CSRF surface to any Vercel preview deployment under that name.
    ...(process.env.NODE_ENV === 'development'
      ? ['http://localhost:3000', 'http://localhost:3001']
      : []),
  ].filter(Boolean) as string[]
)

/**
 * Validates the Origin header on mutating requests (POST/PATCH/PUT/DELETE).
 * Returns a 403 response if the origin is missing or rejected, otherwise null.
 *
 * The Referer fallback is intentionally removed for mutating requests: Referer
 * can be spoofed in some environments and is absent on private-mode requests,
 * creating an inconsistent gate. Requiring Origin is the modern CSRF standard.
 * GET/HEAD/OPTIONS are always allowed (no state mutation, browsers send Origin
 * on cross-origin fetches only).
 */
export function validateOrigin(request: NextRequest): NextResponse | null {
  const method = request.method
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null

  const origin = request.headers.get('origin')
  if (!origin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (ALLOWED_ORIGINS.has(origin)) return null
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
