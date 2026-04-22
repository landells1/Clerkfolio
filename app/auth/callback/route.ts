import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Allowlist of safe post-auth destinations
const ALLOWED_NEXT_PATHS = [
  '/dashboard',
  '/onboarding',
  '/settings',
  '/portfolio',
  '/cases',
  '/specialties',
  '/export',
]

function safeRedirectPath(next: string | null): string {
  if (!next) return '/onboarding'
  // Must be a relative path (starts with / but not //)
  if (!next.startsWith('/') || next.startsWith('//')) return '/onboarding'
  // Must match an allowed prefix
  if (ALLOWED_NEXT_PATHS.some(allowed => next === allowed || next.startsWith(allowed + '/'))) {
    return next
  }
  return '/onboarding'
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next'))

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
