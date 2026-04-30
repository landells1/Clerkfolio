import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ORIGINS = new Set(
  [
    process.env.NEXT_PUBLIC_APP_URL,
    'https://clerkfolio.co.uk',
    'https://www.clerkfolio.co.uk',
    'https://clerkfolio.vercel.app',
    // Allow localhost in development
    ...(process.env.NODE_ENV === 'development'
      ? ['http://localhost:3000', 'http://localhost:3001']
      : []),
  ].filter(Boolean) as string[]
)

/**
 * Validates that the request Origin header, if present, matches an allowed domain.
 * Returns a 403 response if the origin is rejected, otherwise null.
 * Absence of Origin is permitted — it indicates a same-origin or server-side request.
 */
export function validateOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin')
  if (!origin) {
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') return null

    const referer = request.headers.get('referer')
    if (referer) {
      try {
        if (ALLOWED_ORIGINS.has(new URL(referer).origin)) return null
      } catch {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (ALLOWED_ORIGINS.has(origin)) return null
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
