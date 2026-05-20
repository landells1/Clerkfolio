// @vitest-environment node
//
// Tests for /api/student-email/send-verification. Covers Codex 2026-05-20 #4:
//   - Cooldown returns 429 WITHOUT consuming the existing token
//     (route delegates that decision to reserve_student_email_token RPC, so
//     we assert the route forwards the RPC's 'cooldown' status as 429).
//   - cross-user-pending returns 409.
//   - Resend send failure triggers rollback_student_email_token.
//   - Verified-by-another-account returns 409 before the RPC is even called.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const USER_ID = '22222222-2222-2222-2222-222222222222'

const state: {
  user: { id: string } | null
  verifiedByOther: { id: string } | null
  reserveStatus: string
  rollbackCalls: number
  sendShouldFail: boolean
} = {
  user: { id: USER_ID },
  verifiedByOther: null,
  reserveStatus: 'reserved',
  rollbackCalls: 0,
  sendShouldFail: false,
}

vi.mock('@/lib/csrf', () => ({
  validateOrigin: vi.fn(() => null),
}))

vi.mock('@/lib/supabase/server', () => {
  return {
    createClient: () => ({
      auth: { getUser: async () => ({ data: { user: state.user } }) },
    }),
    createServiceClient: () => ({
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  neq: () => ({
                    maybeSingle: async () => ({ data: state.verifiedByOther, error: null }),
                  }),
                }),
              }),
            }),
          }
        }
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
        }
      },
      rpc: (fn: string) => {
        if (fn === 'reserve_student_email_token') {
          return {
            single: async () => ({
              data: { status: state.reserveStatus, last_sent_at: null },
              error: null,
            }),
          }
        }
        if (fn === 'rollback_student_email_token') {
          state.rollbackCalls++
          return Promise.resolve({ data: null, error: null })
        }
        return { single: async () => ({ data: null, error: null }) }
      },
    }),
  }
})

vi.mock('resend', () => {
  return {
    Resend: class {
      emails = {
        send: vi.fn(async () => ({
          error: state.sendShouldFail ? { message: 'send blew up' } : null,
        })),
      }
    },
  }
})

import { POST as sendVerification } from '@/app/api/student-email/send-verification/route'

function makeReq(email = 'student@imperial.ac.uk') {
  return new NextRequest('https://clerkfolio.co.uk/api/student-email/send-verification', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://clerkfolio.co.uk' },
    body: JSON.stringify({ email }),
  })
}

beforeEach(() => {
  state.user = { id: USER_ID }
  state.verifiedByOther = null
  state.reserveStatus = 'reserved'
  state.rollbackCalls = 0
  state.sendShouldFail = false
})

describe('POST /api/student-email/send-verification — #4 token race fixes', () => {
  it('happy path: 200 ok when the RPC reserves a token and Resend succeeds', async () => {
    const res = await sendVerification(makeReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(state.rollbackCalls).toBe(0)
  })

  it('cooldown: RPC returns 429 and the route surfaces it WITHOUT calling rollback', async () => {
    state.reserveStatus = 'cooldown'
    const res = await sendVerification(makeReq())
    expect(res.status).toBe(429)
    expect(state.rollbackCalls).toBe(0)
  })

  it('cross-user-pending: RPC returns 409 to block inbox spam', async () => {
    state.reserveStatus = 'cross_user_pending'
    const res = await sendVerification(makeReq())
    expect(res.status).toBe(409)
    expect(state.rollbackCalls).toBe(0)
  })

  it('Resend failure rolls back the reserved token (Codex finding #5 partial)', async () => {
    state.sendShouldFail = true
    const res = await sendVerification(makeReq())
    expect(res.status).toBe(500)
    expect(state.rollbackCalls).toBe(1)
  })

  it('verified-by-other-account short-circuits to 409 before the RPC is called', async () => {
    state.verifiedByOther = { id: '00000000-0000-0000-0000-000000000099' }
    // If we got past this branch the reserveStatus default 'reserved' would
    // return 200; assert 409 instead.
    const res = await sendVerification(makeReq())
    expect(res.status).toBe(409)
  })

  it('rejects non-institutional email with 400', async () => {
    const res = await sendVerification(makeReq('alice@gmail.com'))
    expect(res.status).toBe(400)
  })

  it('rejects when unauthenticated', async () => {
    state.user = null
    const res = await sendVerification(makeReq())
    expect(res.status).toBe(401)
  })
})
