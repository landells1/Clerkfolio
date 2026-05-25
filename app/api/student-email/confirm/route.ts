import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { grantEligibleReferralReward, grantPendingReferralRewardsForReferrer } from '@/lib/referrals/rewards'
import { safeJsonBody, badJson } from '@/lib/safe-json'

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

type ConfirmStatus = 'verified' | 'invalid' | 'expired' | 'already_used' | 'wrong_account'

function respond(status: ConfirmStatus, extra: Record<string, unknown> = {}) {
  const ok = status === 'verified'
  return NextResponse.json({ status, ...extra }, { status: ok ? 200 : 400 })
}

// Confirmation is POST-only so corporate proxies and link-preview GET
// requests cannot consume the token. The /verify-email landing page submits
// it after it opens in the authenticated browser; the owner check below
// prevents an unauthenticated scanner from consuming it.
export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const body = await safeJsonBody<{ token?: unknown }>(req)
  if (!body) return badJson()
  const token = typeof body.token === 'string' ? body.token : ''
  if (!token || token.length < 20) return respond('invalid')

  const tokenHash = hashToken(token)
  const service = createServiceClient()

  // Cross-account guard. If the current browser session is logged in as a
  // different account than the token's owner, do NOT consume the token. Tell
  // the verify-email page to sign the user out and redirect to login with a
  // banner explaining the situation. Without this check, the service-role
  // RPC verifies account A while the browser keeps showing account B's
  // dashboard with a misleading "Verified" toast.
  //
  // Peek at the token first to learn its user_id; the RPC will be called
  // afterwards to actually consume it.
  const { data: tokenRow } = await service
    .from('student_email_verification_tokens')
    .select('user_id, consumed_at, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  const userClient = createClient()
  const { data: { user: currentUser } } = await userClient.auth.getUser()

  // Block: unauthenticated caller OR authenticated caller who is not the token
  // owner. The original `&& currentUser &&` short-circuit meant that a null
  // session (unauthenticated visitor clicking the link) bypassed this guard
  // entirely and the service-role RPC ran unchecked, verifying the attacker's
  // account with the victim's institutional email.
  if (tokenRow && (!currentUser || currentUser.id !== tokenRow.user_id)) {
    return respond('wrong_account')
  }

  // confirm_student_email_token is a SECURITY DEFINER RPC that holds a row-
  // level lock on the token, validates expiry/consumption/duplicate-email,
  // and commits the profile update + token consumption together.
  const { data, error } = await service
    .rpc('confirm_student_email_token', { p_token_hash: tokenHash })
    .single<{ status: ConfirmStatus; user_id: string | null; email: string | null }>()

  if (error || !data) {
    console.error('student-email/confirm RPC failed:', error?.message ?? 'no data')
    return respond('invalid')
  }

  if (data.status === 'verified' && data.user_id) {
    await grantEligibleReferralReward(service, data.user_id)
    await grantPendingReferralRewardsForReferrer(service, data.user_id)
    // Re-derive tier centrally so the auth.callback-then-onboarding sequence
    // also lands on the right tier when the confirm path is involved.
    await service.rpc('recompute_profile_tier', { p_user_id: data.user_id })
  }

  return respond(data.status)
}
