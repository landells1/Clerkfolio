import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { claimVerifiedInstitutionalAuthEmail } from '@/lib/institutional-auth-email'

// Allowlist of safe post-auth destinations
const ALLOWED_NEXT_PATHS = [
  '/dashboard',
  '/onboarding',
  '/settings',
  '/portfolio',
  '/cases',
  '/specialties',
  '/export',
  '/update-password',
]

function safeRedirectPath(next: string | null): string {
  if (!next) return '/onboarding'
  if (!next.startsWith('/') || next.startsWith('//')) return '/onboarding'
  const parsed = new URL(next, 'https://clerkfolio.local')
  if (!ALLOWED_NEXT_PATHS.some(allowed => parsed.pathname === allowed || parsed.pathname.startsWith(allowed + '/'))) {
    return '/onboarding'
  }
  if (parsed.pathname === '/onboarding') {
    const postOnboardingNext = parsed.searchParams.get('next')
    if (postOnboardingNext?.startsWith('/') && !postOnboardingNext.startsWith('//')) {
      const target = new URL(postOnboardingNext, 'https://clerkfolio.local')
      if (target.pathname === '/upgrade') {
        return `/onboarding?next=${encodeURIComponent(`${target.pathname}${target.search}`)}`
      }
    }
    return '/onboarding'
  }
  return `${parsed.pathname}${parsed.search}`
}

const RECOVERY_COOKIE = 'cf_recovery'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      // Referral attribution from user_metadata.referral_code is permitted ONLY
      // during the initial signup-confirmation callback. user_metadata is editable
      // by the authenticated user (supabase.auth.updateUser), so without this
      // freshness gate a user who initially signed up without a referral could
      // later mutate their metadata to add one and trigger this callback (e.g.
      // via a password reset) to backdate the attribution.
      //
      // The DB trigger handle_new_user is the primary source of truth for
      // profiles.referred_by - this branch is a fallback for the case where the
      // trigger did not see the metadata at insert time. The 10-minute window is
      // tight enough to exclude post-hoc metadata edits but generous enough for
      // email-confirmation latency.
      const referralCode = user?.user_metadata?.referral_code
      // Use email_confirmed_at with a 60-second window instead of created_at
      // with 10 minutes. email_confirmed_at is set at the moment of OTP
      // exchange — just now — so a 60s window still covers confirmation latency
      // while preventing a user who signed up without a referral from later
      // editing their user_metadata and then re-triggering this callback (e.g.
      // via a password reset link) to backdate the attribution.
      const emailConfirmedAt = user?.email_confirmed_at ? new Date(user.email_confirmed_at).getTime() : null
      const isFreshSignup = emailConfirmedAt !== null && Date.now() - emailConfirmedAt < 60 * 1000
      if (
        user
        && isFreshSignup
        && typeof referralCode === 'string'
        && /^[A-Z]{5}$/.test(referralCode.trim().toUpperCase())
      ) {
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
          // Record the referral event (ignore conflict if row already exists)
          await service.from('referrals').upsert(
            { referrer_id: referrer.id, referred_id: user.id, status: 'pending' },
            { onConflict: 'referred_id', ignoreDuplicates: true },
          )
        }
      }

      // A confirmed signup email is sufficient proof for institutional tier
      // eligibility. Use the same claim routine as token-hash confirmation so
      // the two Supabase email-template modes cannot drift.
      if (user) {
        const status = await claimVerifiedInstitutionalAuthEmail(createServiceClient(), user)
        if (status === 'conflict') {
          const conflictNext = `${next}${next.includes('?') ? '&' : '?'}student_email=conflict`
          return NextResponse.redirect(`${origin}${conflictNext}`)
        }
      }

      const response = NextResponse.redirect(`${origin}${next}`)
      // Gate the recovery cookie on whether a true recovery session was
      // actually established, not just on the `next` query parameter value.
      // A crafted callback URL with next=/update-password would otherwise
      // grant the cookie to a non-recovery code exchange. The Supabase session
      // type check below uses the AMR (authenticator method reference) embedded
      // in the JWT to detect a genuine recovery grant.
      // TTL is 120s — short enough to minimise the window a stolen cookie is
      // useful, long enough for the /update-password page to load.
      if (next === '/update-password') {
        const { data: { session } } = await supabase.auth.getSession()
        const amr = session?.user?.app_metadata?.amr as Array<{ method: string }> | undefined
        const isRecovery = Array.isArray(amr) && amr.some(a => a.method === 'recovery')
        if (isRecovery) {
          response.cookies.set(RECOVERY_COOKIE, '1', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 120,
          })
        }
      }
      return response
    }
  }

  const errorContext = next === '/update-password' ? '&type=recovery' : ''
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed${errorContext}`)
}
