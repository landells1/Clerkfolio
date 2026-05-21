import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isInstitutionEmail, normaliseEmail } from '@/lib/institutional-email'
import { grantEligibleReferralReward, grantPendingReferralRewardsForReferrer } from '@/lib/referrals/rewards'

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
  // Must be a relative path (starts with / but not //)
  if (!next.startsWith('/') || next.startsWith('//')) return '/onboarding'
  // Must match an allowed prefix
  if (ALLOWED_NEXT_PATHS.some(allowed => next === allowed || next.startsWith(allowed + '/'))) {
    return next
  }
  return '/onboarding'
}

const RECOVERY_COOKIE = 'cf_recovery'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next'))

  if (code) {
    const supabase = createClient()
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

      // Auto-verify institutional email when the signup email itself is .ac.uk or NHS.
      // Supabase has already verified the address end-to-end via the confirm link;
      // forcing a second verification email to the same inbox is pure UX friction
      // (logged as P3 in the 2026-05-16 e2e). Skip if already verified, or if a
      // different institutional address is in flight, or if the user is already Pro.
      if (user?.email) {
        const signupEmail = normaliseEmail(user.email)
        if (isInstitutionEmail(signupEmail)) {
          const service = createServiceClient()
          const { data: profile } = await service
            .from('profiles')
            .select('student_email, student_email_verified')
            .eq('id', user.id)
            .single()

          const noInstitutionalSet = !profile?.student_email || normaliseEmail(profile.student_email) === signupEmail
          if (profile && !profile.student_email_verified && noInstitutionalSet) {
            // Belt-and-braces: ensure no other verified profile holds this
            // address. Use a normalised-equality compare via service-role SQL
            // rather than ilike (where _ and % are wildcards that can false-
            // match similar-looking institutional addresses).
            const { data: existingVerifiedProfile } = await service
              .from('profiles')
              .select('id')
              .eq('student_email_verified', true)
              .eq('student_email', signupEmail)
              .neq('id', user.id)
              .maybeSingle()

            if (!existingVerifiedProfile) {
              const now = new Date()
              const dueAt = new Date(now)
              dueAt.setFullYear(dueAt.getFullYear() + 1)

              // Write verification fields only. tier is centrally re-derived by
              // recompute_profile_tier below so that NHS-verified-before-
              // onboarding (career_stage still null) is correctly bumped to
              // 'foundation' once /api/onboarding/complete fires recompute
              // again.
              await service
                .from('profiles')
                .update({
                  student_email: signupEmail,
                  student_email_verified: true,
                  student_email_verified_at: now.toISOString(),
                  student_email_verification_due_at: dueAt.toISOString().split('T')[0],
                })
                .eq('id', user.id)

              await service.rpc('recompute_profile_tier', { p_user_id: user.id })
              await grantEligibleReferralReward(service, user.id)
              await grantPendingReferralRewardsForReferrer(service, user.id)
            } else {
              // Another Clerkfolio account already holds this institutional
              // email as verified. Log the conflict for operators and surface a
              // banner to the user so they understand why their account is on
              // the free tier rather than silently failing.
              await service.from('audit_log').insert({
                user_id: user.id,
                action: 'login',
                metadata: {
                  event: 'institutional_email_conflict',
                  email: signupEmail,
                  conflicting_profile_id: existingVerifiedProfile.id,
                },
              })
              // Append conflict indicator to the redirect target. The settings
              // page (and onboarding page) handles ?student_email=conflict to
              // show a banner explaining the situation.
              const conflictNext = `${next}${next.includes('?') ? '&' : '?'}student_email=conflict`
              return NextResponse.redirect(`${origin}${conflictNext}`)
            }
          }
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

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
