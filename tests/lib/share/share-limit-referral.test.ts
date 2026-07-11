// @vitest-environment node
//
// Focused tests for POST /api/share's free-tier share-link allowance, which is
// 1 base link + 1 per rewarded referral (`subInfo.referralCount`), not a flat 1.
// A prior bug hard-coded `limit: 1` and `> 1` in the post-insert compensating
// race guard, so a free user with >=1 rewarded referral had their legitimately
// allowed 2nd (or later) link created then immediately deleted with a 403. We
// mock the Supabase server clients, CSRF origin check, and fetchSubscriptionInfo
// at the module boundary (same pattern as revoke-audit.test.ts).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const USER_ID = 'user-1'

type SubInfoStub = {
  isPro: boolean
  referralCount: number
  limits: { canCreateShareLink: boolean }
  usage: { shareLinksUsed: number }
}

const state: {
  user: { id: string } | null
  subInfo: SubInfoStub
  actualCount: number
  insertedRow: Record<string, unknown> | null
  deletedIds: string[]
  rpcCalls: Array<{ name: string; args: unknown }>
} = {
  user: { id: USER_ID },
  subInfo: { isPro: false, referralCount: 0, limits: { canCreateShareLink: true }, usage: { shareLinksUsed: 0 } },
  actualCount: 0,
  insertedRow: null,
  deletedIds: [],
  rpcCalls: [],
}

vi.mock('@/lib/csrf', () => ({ validateOrigin: vi.fn(() => null) }))

vi.mock('@/lib/subscription', () => ({
  fetchSubscriptionInfo: vi.fn(async () => state.subInfo),
}))

vi.mock('@/lib/supabase/server', () => {
  function userClient() {
    return {
      auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
      from: (table: string) => {
        if (table === 'share_links') {
          // .select('id', {count:'exact', head:true}).eq('user_id',...).is('revoked_at', null).gt('expires_at', ...)
          const chain = {
            eq: () => chain,
            is: () => chain,
            gt: () => Promise.resolve({ count: state.actualCount, error: null }),
          }
          return { select: () => chain }
        }
        return {}
      },
      rpc: (name: string, args: unknown) => {
        state.rpcCalls.push({ name, args })
        return Promise.resolve({ error: null })
      },
    }
  }
  function serviceClient() {
    return {
      from: (table: string) => {
        if (table === 'share_links') {
          return {
            insert: (row: Record<string, unknown>) => {
              state.insertedRow = { id: 'link-1', view_count: 0, created_at: '2026-07-10T00:00:00.000Z', ...row }
              return { select: () => ({ single: async () => ({ data: state.insertedRow, error: null }) }) }
            },
            delete: () => ({
              eq: (_key: string, value: string) => {
                state.deletedIds.push(value)
                return Promise.resolve({ error: null })
              },
            }),
          }
        }
        if (table === 'audit_log') {
          return { insert: async () => ({ data: null, error: null }) }
        }
        return {}
      },
    }
  }
  return {
    createClient: async () => userClient(),
    createServiceClient: () => serviceClient(),
  }
})

// Import AFTER vi.mock so the route picks up the fakes.
import { POST as createShareLink } from '@/app/api/share/route'

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('https://clerkfolio.co.uk/api/share', {
    method: 'POST',
    headers: { origin: 'https://clerkfolio.co.uk', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/share — referral-aware free allowance (1 + referralCount)', () => {
  beforeEach(() => {
    state.user = { id: USER_ID }
    state.actualCount = 0
    state.insertedRow = null
    state.deletedIds = []
    state.rpcCalls = []
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '') // skip the audit_log side-path, not under test here
  })

  it('reports the real allowance (not a hard-coded 1) when the pre-insert check rejects', async () => {
    state.subInfo = {
      isPro: false,
      referralCount: 2,
      limits: { canCreateShareLink: false },
      usage: { shareLinksUsed: 3 },
    }
    const res = await createShareLink(makeRequest({ scope: 'full' }))
    const json = await res.json()
    expect(res.status).toBe(403)
    expect(json.error).toBe('limit_reached')
    expect(json.limit).toBe(3) // 1 base + 2 referrals
    expect(json.used).toBe(3)
    expect(state.deletedIds).toHaveLength(0)
  })

  it('does not revoke a legitimately-allowed 2nd link when the referrer has a rewarded referral', async () => {
    state.subInfo = {
      isPro: false,
      referralCount: 1,
      limits: { canCreateShareLink: true },
      usage: { shareLinksUsed: 1 },
    }
    state.actualCount = 2 // 1 base + 1 referral = exactly at the allowance, not over it
    const res = await createShareLink(makeRequest({ scope: 'full' }))
    expect(res.status).toBe(201)
    expect(state.deletedIds).toHaveLength(0)
    expect(state.rpcCalls).toHaveLength(1)
    expect(state.rpcCalls[0]).toMatchObject({ name: 'increment_pro_feature_usage' })
  })

  it('still revokes and reports the correct limit when actual usage exceeds the referral-adjusted allowance', async () => {
    state.subInfo = {
      isPro: false,
      referralCount: 1,
      limits: { canCreateShareLink: true },
      usage: { shareLinksUsed: 1 },
    }
    state.actualCount = 3 // over the allowed 1 + 1 = 2
    const res = await createShareLink(makeRequest({ scope: 'full' }))
    const json = await res.json()
    expect(res.status).toBe(403)
    expect(json.error).toBe('limit_reached')
    expect(json.limit).toBe(2)
    expect(json.used).toBe(3)
    expect(state.deletedIds).toEqual(['link-1'])
    expect(state.rpcCalls).toHaveLength(0)
  })
})
