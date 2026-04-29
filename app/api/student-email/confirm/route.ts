import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { grantEligibleReferralReward, grantPendingReferralRewardsForReferrer } from '@/lib/referrals/rewards'
import { isAcUkEmail } from '@/lib/institutional-email'

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function redirectToSettings(req: NextRequest, status: 'verified' | 'invalid' | 'expired') {
  const url = new URL('/settings', req.nextUrl.origin)
  url.searchParams.set('student_email', status)
  return NextResponse.redirect(url)
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token || token.length < 20) return redirectToSettings(req, 'invalid')

  const service = createServiceClient()
  const { data: verification } = await service
    .from('student_email_verification_tokens')
    .select('id, user_id, email, expires_at, consumed_at')
    .eq('token_hash', hashToken(token))
    .maybeSingle()

  if (!verification || verification.consumed_at) return redirectToSettings(req, 'invalid')
  if (new Date(verification.expires_at).getTime() < Date.now()) return redirectToSettings(req, 'expired')

  const now = new Date()
  const dueAt = new Date(now)
  dueAt.setFullYear(dueAt.getFullYear() + 1)

  const { data: profile } = await service
    .from('profiles')
    .select('tier, career_stage')
    .eq('id', verification.user_id)
    .single()

  const isStudentEmail = isAcUkEmail(verification.email)
  const nextTier = profile?.tier === 'pro'
    ? 'pro'
    : isStudentEmail
      ? 'student'
      : ['FY1', 'FY2', 'POST_FY'].includes(profile?.career_stage ?? '')
        ? 'foundation'
        : 'free'

  await service
    .from('student_email_verification_tokens')
    .update({ consumed_at: now.toISOString() })
    .eq('id', verification.id)

  await service
    .from('profiles')
    .update({
      tier: nextTier,
      student_email: verification.email,
      student_email_verified: true,
      student_email_verified_at: now.toISOString(),
      student_email_verification_due_at: dueAt.toISOString().split('T')[0],
    })
    .eq('id', verification.user_id)

  await grantEligibleReferralReward(service, verification.user_id)
  await grantPendingReferralRewardsForReferrer(service, verification.user_id)

  return redirectToSettings(req, 'verified')
}
