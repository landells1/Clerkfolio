import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { grantEligibleReferralReward, grantPendingReferralRewardsForReferrer } from '@/lib/referrals/rewards'
import { safeJsonBody, badJson } from '@/lib/safe-json'

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

type ConfirmStatus = 'verified' | 'invalid' | 'expired' | 'already_used'

function respond(status: ConfirmStatus) {
  return NextResponse.json({ status }, { status: status === 'verified' ? 200 : 400 })
}

// Confirmation is POST-only so corporate proxies, link-preview bots, and
// browser speculative prefetch can't consume the token. The /verify-email
// landing page submits this as a real form POST after explicit user click.
export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const body = await safeJsonBody<{ token?: unknown }>(req)
  if (!body) return badJson()
  const token = typeof body.token === 'string' ? body.token : ''
  if (!token || token.length < 20) return respond('invalid')

  const service = createServiceClient()
  // confirm_student_email_token is a SECURITY DEFINER RPC that holds a row-
  // level lock on the token, validates expiry/consumption/duplicate-email,
  // and commits the profile update + token consumption together. Replaces
  // the prior multi-step JS dance which could half-commit on partial errors.
  const { data, error } = await service
    .rpc('confirm_student_email_token', { p_token_hash: hashToken(token) })
    .single<{ status: ConfirmStatus; user_id: string | null; email: string | null }>()

  if (error || !data) {
    console.error('student-email/confirm RPC failed:', error?.message ?? 'no data')
    return respond('invalid')
  }

  if (data.status === 'verified' && data.user_id) {
    await grantEligibleReferralReward(service, data.user_id)
    await grantPendingReferralRewardsForReferrer(service, data.user_id)
  }

  return respond(data.status)
}
