import { createClient, createServiceClient } from '@/lib/supabase/server'
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
      const { data: { user } } = await supabase.auth.getUser()
      const referralCode = user?.user_metadata?.referral_code
      if (user && typeof referralCode === 'string' && /^[A-Z]{5}$/.test(referralCode.trim().toUpperCase())) {
        const normalizedCode = referralCode.trim().toUpperCase()
        const service = createServiceClient()
        const { data: referrer } = await service
          .from('profiles')
          .select('id')
          .eq('referral_code', normalizedCode)
          .neq('id', user.id)
          .maybeSingle()
        if (referrer) {
          await service
            .from('profiles')
            .update({ referred_by: referrer.id })
            .eq('id', user.id)
            .is('referred_by', null)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
