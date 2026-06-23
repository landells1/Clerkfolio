// @vitest-environment node
//
// Tests for /api/student-email/confirm. Covers Codex 2026-05-20 #5
// (cross-account verification leakage) and the confirm-side of #4.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const TOKEN_OWNER_ID = '33333333-3333-3333-3333-333333333333'
const OTHER_USER_ID = '44444444-4444-4444-4444-444444444444'

const state: {
  currentUser: { id: string } | null
  tokenRow: { user_id: string; consumed_at: string | null; expires_at: string } | null
  rpcStatus: 'verified' | 'invalid' | 'expired' | 'already_used'
  recomputeCalls: Array<unknown>
} = {
  currentUser: { id: TOKEN_OWNER_ID },
  tokenRow: { user_id: TOKEN_OWNER_ID, consumed_at: null, expires_at: new Date(Date.now() + 3600_000).toISOString() },
  rpcStatus: 'verified',
  recomputeCalls: [],
}

vi.mock('@/lib/csrf', () => ({ validateOrigin: vi.fn(() => null) }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: state.currentUser } }) },
  }),
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === 'student_email_verification_tokens') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: state.tokenRow, error: null }),
            }),
          }),
        }
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }
    },
    rpc: (fn: string, args?: unknown) => {
      if (fn === 'confirm_student_email_token') {
        return {
          single: async () => ({
            data: { status: state.rpcStatus, user_id: state.tokenRow?.user_id ?? null, email: 'student@test.ac.uk' },
            error: null,
          }),
        }
      }
      if (fn === 'recompute_profile_tier') {
        state.recomputeCalls.push(args)
        return Promise.resolve({ data: null, error: null })
      }
      return { single: async () => ({ data: null, error: null }) }
    },
  }),
}))

vi.mock('@/lib/referrals/rewards', () => ({
  markReferralActivationIfEligible: vi.fn(async () => ({ activated: false, reason: 'no_referrer' })),
  processReferralsForReferrer: vi.fn(async () => []),
}))

import { POST as confirm } from '@/app/api/student-email/confirm/route'

function makeReq(token = 'a'.repeat(40)) {
  return new NextRequest('https://clerkfolio.co.uk/api/student-email/confirm', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://clerkfolio.co.uk' },
    body: JSON.stringify({ token }),
  })
}

beforeEach(() => {
  state.currentUser = { id: TOKEN_OWNER_ID }
  state.tokenRow = { user_id: TOKEN_OWNER_ID, consumed_at: null, expires_at: new Date(Date.now() + 3600_000).toISOString() }
  state.rpcStatus = 'verified'
  state.recomputeCalls = []
})

describe('POST /api/student-email/confirm — Codex 2026-05-20 #5 (cross-account)', () => {
  it('happy path: 200 verified and recompute_profile_tier fires', async () => {
    const res = await confirm(makeReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('verified')
    expect(state.recomputeCalls.length).toBe(1)
  })

  it('#5: returns wrong_account when session belongs to a different user, WITHOUT consuming token', async () => {
    state.currentUser = { id: OTHER_USER_ID }
    const res = await confirm(makeReq())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.status).toBe('wrong_account')
    // recompute should not have been called - we bailed before the RPC even fired.
    expect(state.recomputeCalls.length).toBe(0)
  })

  it('#6 regression: unauthenticated caller is blocked (wrong_account), token NOT consumed', async () => {
    state.currentUser = null
    const res = await confirm(makeReq())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.status).toBe('wrong_account')
    // RPC must not have been called — token should remain unconsumed.
    expect(state.recomputeCalls.length).toBe(0)
  })

  it('returns invalid for a missing/short token', async () => {
    const res = await confirm(makeReq('short'))
    expect(res.status).toBe(400)
    expect((await res.json()).status).toBe('invalid')
  })

  it('passes through expired status from the RPC', async () => {
    state.rpcStatus = 'expired'
    const res = await confirm(makeReq())
    expect(res.status).toBe(400)
    expect((await res.json()).status).toBe('expired')
  })

  it('passes through already_used status from the RPC', async () => {
    state.rpcStatus = 'already_used'
    const res = await confirm(makeReq())
    expect(res.status).toBe(400)
    expect((await res.json()).status).toBe('already_used')
  })
})
