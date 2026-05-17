import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isAcUkEmail, isInstitutionEmail, isNhsEmail, normaliseEmail } from '@/lib/institutional-email'
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
      const accountCreatedAt = user?.created_at ? new Date(user.created_at).getTime() : null
      const isFreshSignup = accountCreatedAt !== null && Date.now() - accountCreatedAt < 10 * 60 * 1000
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
            .select('tier, career_stage, student_email, student_email_verified')
            .eq('id', user.id)
            .single()

          const noInstitutionalSet = !profile?.student_email || normaliseEmail(profile.student_email) === signupEmail
          if (profile && !profile.student_email_verified && noInstitutionalSet) {
            // Belt-and-braces: ensure no other verified profile holds this address.
            const { data: existingVerifiedProfile } = await service
              .from('profiles')
              .select('id')
              .eq('student_email_verified', true)
              .ilike('student_email', signupEmail)
              .neq('id', user.id)
              .maybeSingle()

            if (!existingVerifiedProfile) {
              const now = new Date()
              const dueAt = new Date(now)
              dueAt.setFullYear(dueAt.getFullYear() + 1)

              const isStudent = isAcUkEmail(signupEmail)
              const isFoundationEligible = isNhsEmail(signupEmail)
                && ['FY1', 'FY2', 'POST_FY'].includes(profile.career_stage ?? '')
              const nextTier = profile.tier === 'pro'
                ? 'pro'
                : isStudent
                  ? 'student'
                  : isFoundationEligible
                    ? 'foundation'
                    : profile.tier ?? 'free'

              await service
                .from('profiles')
                .update({
                  tier: nextTier,
                  student_email: signupEmail,
                  student_email_verified: true,
                  student_email_verified_at: now.toISOString(),
                  student_email_verification_due_at: dueAt.toISOString().split('T')[0],
                })
                .eq('id', user.id)

              await grantEligibleReferralReward(service, user.id)
              await grantPendingReferralRewardsForReferrer(service, user.id)
            }
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
