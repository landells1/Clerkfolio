// @vitest-environment node
//
// Integration-ish tests for /api/onboarding/complete. We mock @/lib/supabase/server
// and @/lib/csrf at the module boundary so the route handler exercises its own
// branching logic against in-memory fake clients. Covers the Codex 2026-05-20
// findings:
//
//   #1  Missing-profile repair must self-heal via the user-bound RPC (the prior
//       service-role caller failed silently because auth.uid() returned null).
//   #3  Two-tab onboarding completion is idempotent: the second tab MUST get a
//       409, not run the service-role specialty/notifications block again.
//   #6  NHS-verified-before-onboarding lands on the right tier: the route MUST
//       call recompute_profile_tier after the career_stage write.
//
// We also exercise the protection that the route does not re-invoke the
// service-role specialty upsert when the profile UPDATE no-ops (the
// "Restart tutorial bypass" attack surface from Codex finding #2).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const STARTING_USER_ID = '11111111-1111-1111-1111-111111111111'

// ─── Mock setup ────────────────────────────────────────────────────────────
// vi.mock factory must be self-contained (top-level only sees hoisted imports).
// We expose a `__state` object so tests can swap the per-test fake behaviour.
const supabaseState: {
  user: { id: string; email?: string } | null
  profileRow: { onboarding_complete: boolean; referred_by: string | null } | null
  profileFetchError: { message: string } | null
  // For the UPDATE step: should the .maybeSingle return a row (success) or null (race)?
  updateRow: { id: string } | null
  updateError: { message: string } | null
  // For the ensure_profile RPC: success or error?
  ensureRpcError: { message: string } | null
  // Spies
  recomputeRpcCalls: Array<unknown>
  ensureRpcCalledOnUserClient: boolean
  ensureRpcCalledOnServiceClient: boolean
  profileUpdateClientKinds: Array<'user' | 'service'>
} = {
  user: { id: STARTING_USER_ID, email: 'student@example.ac.uk' },
  profileRow: { onboarding_complete: false, referred_by: null },
  profileFetchError: null,
  updateRow: { id: STARTING_USER_ID },
  updateError: null,
  ensureRpcError: null,
  recomputeRpcCalls: [],
  ensureRpcCalledOnUserClient: false,
  ensureRpcCalledOnServiceClient: false,
  profileUpdateClientKinds: [],
}

vi.mock('@/lib/csrf', () => ({
  validateOrigin: vi.fn(() => null),
}))

vi.mock('@/lib/supabase/server', () => {
  // Chainable thenable that pretends to be a supabase query builder.
  function builder(table: string, clientKind: 'user' | 'service') {
    const ctx = { table, clientKind, filters: {} as Record<string, unknown> }
    const chain = {
      select: () => chain,
      eq: (k: string, v: unknown) => { ctx.filters[k] = v; return chain },
      in: () => chain,
      neq: () => chain,
      is: () => chain,
      gt: () => chain,
      maybeSingle: async () => {
        if (ctx.table === 'profiles') {
          return { data: supabaseState.profileRow, error: supabaseState.profileFetchError }
        }
        if (ctx.table === 'deadlines') {
          return { data: [], error: null }
        }
        return { data: null, error: null }
      },
      single: async () => ({ data: null, error: null }),
      then: undefined as never,
    }
    // Mutating ops
    return {
      ...chain,
      insert: async () => ({ data: null, error: null }),
      upsert: async () => ({ data: null, error: null }),
      update: () => ({
        eq: (k: string, v: unknown) => {
          ctx.filters[k] = v
          return {
            eq: (k2: string, v2: unknown) => {
              ctx.filters[k2] = v2
              return {
                select: () => ({
                  maybeSingle: async () => {
                    if (ctx.table === 'profiles') {
                      supabaseState.profileUpdateClientKinds.push(ctx.clientKind)
                    }
                    return {
                      data: supabaseState.updateRow,
                      error: supabaseState.updateError,
                    }
                  },
                }),
              }
            },
          }
        },
      }),
    }
  }

  function makeClient(kind: 'user' | 'service') {
    return {
      auth: {
        getUser: async () => ({ data: { user: supabaseState.user }, error: null }),
      },
      from: (table: string) => {
        // Track the count select used for starter notifications: it expects
        // .eq().then-resolves to { count, error }.
        if (table === 'notifications') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ count: 0, error: null }),
            }),
            insert: async () => ({ data: null, error: null }),
          }
        }
        if (table === 'specialty_applications') {
          return {
            ...builder(table, kind),
            upsert: async () => ({ error: null }),
          }
        }
        if (table === 'deadlines') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  in: async () => ({ data: [], error: null }),
                }),
              }),
            }),
            insert: async () => ({ error: null }),
          }
        }
        return builder(table, kind)
      },
      rpc: (fn: string, args?: unknown) => {
        if (fn === 'ensure_profile_for_current_user') {
          if (kind === 'user') supabaseState.ensureRpcCalledOnUserClient = true
          if (kind === 'service') supabaseState.ensureRpcCalledOnServiceClient = true
          return {
            single: async () => ({
              data: null,
              error: supabaseState.ensureRpcError,
            }),
          }
        }
        if (fn === 'recompute_profile_tier') {
          supabaseState.recomputeRpcCalls.push(args)
          return Promise.resolve({ data: null, error: null })
        }
        return { single: async () => ({ data: null, error: null }) }
      },
    }
  }

  return {
    createClient: () => makeClient('user'),
    createServiceClient: () => makeClient('service'),
  }
})

vi.mock('@/lib/referrals/rewards', () => ({
  grantEligibleReferralReward: vi.fn(async () => ({ ok: true })),
}))

// Import AFTER vi.mock so the route picks up the fakes.
import { POST as onboardingComplete } from '@/app/api/onboarding/complete/route'

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('https://clerkfolio.co.uk/api/onboarding/complete', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://clerkfolio.co.uk',
    },
    body: JSON.stringify(body),
  })
}

const happyBody = {
  firstName: 'Test',
  lastName: 'User',
  careerStage: 'FY1',
  studentGraduationDate: null,
  specialties: ['imt'],
}

beforeEach(() => {
  supabaseState.user = { id: STARTING_USER_ID, email: 'student@example.ac.uk' }
  supabaseState.profileRow = { onboarding_complete: false, referred_by: null }
  supabaseState.profileFetchError = null
  supabaseState.updateRow = { id: STARTING_USER_ID }
  supabaseState.updateError = null
  supabaseState.ensureRpcError = null
  supabaseState.recomputeRpcCalls = []
  supabaseState.ensureRpcCalledOnUserClient = false
  supabaseState.ensureRpcCalledOnServiceClient = false
  supabaseState.profileUpdateClientKinds = []
})

describe('POST /api/onboarding/complete — Codex 2026-05-20 #1, #3, #6', () => {
  it('happy path: marks onboarding complete and calls recompute_profile_tier', async () => {
    const res = await onboardingComplete(makeRequest(happyBody))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
    expect(supabaseState.recomputeRpcCalls.length).toBe(1)
    expect(supabaseState.recomputeRpcCalls[0]).toEqual({ p_user_id: STARTING_USER_ID })
  })

  it('regression: profile UPDATE must run on the service-role client so the guard_profile_writes trigger does not revert onboarding_complete', async () => {
    // guard_profile_writes (phase 4 audit) silently reverts onboarding_complete
    // for any user-bound UPDATE. The route must therefore route the profile
    // write through the service-role client, otherwise the UPDATE returns a
    // row id (so the route returns ok:true) but the DB stays with
    // onboarding_complete=false and every new account is stuck on /onboarding.
    const res = await onboardingComplete(makeRequest(happyBody))
    expect(res.status).toBe(200)
    expect(supabaseState.profileUpdateClientKinds).toEqual(['service'])
  })

  it('#1: missing-profile self-heal calls ensure_profile_for_current_user on the USER-bound client', async () => {
    // Simulate the profile fetch returning null - i.e. auth.users exists but
    // public.profiles is missing. Pre-fix: route called the RPC via service
    // role and auth.uid() returned null inside the RPC.
    supabaseState.profileRow = null
    const res = await onboardingComplete(makeRequest(happyBody))
    expect(res.status).toBe(200)
    expect(supabaseState.ensureRpcCalledOnUserClient).toBe(true)
    expect(supabaseState.ensureRpcCalledOnServiceClient).toBe(false)
  })

  it('#1: missing-profile RPC error surfaces as 500 to the client', async () => {
    supabaseState.profileRow = null
    supabaseState.ensureRpcError = { message: 'not_authenticated' }
    const res = await onboardingComplete(makeRequest(happyBody))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/initialise/i)
  })

  it('#3: two-tab race — second tab gets 409 even when initial profile check passes', async () => {
    // First call succeeds; second call simulates the "second tab" scenario
    // where the UPDATE filter eq('onboarding_complete', false) matches zero
    // rows because the first tab already flipped it.
    supabaseState.updateRow = null
    const res = await onboardingComplete(makeRequest(happyBody))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/already complete/i)
    // The bypass test: recompute should NOT fire because we bailed before it.
    expect(supabaseState.recomputeRpcCalls.length).toBe(0)
  })

  it('#3: explicitly-completed profile returns 409 without running any provisioning', async () => {
    supabaseState.profileRow = { onboarding_complete: true, referred_by: null }
    const res = await onboardingComplete(makeRequest(happyBody))
    expect(res.status).toBe(409)
    expect(supabaseState.recomputeRpcCalls.length).toBe(0)
  })

  it('rejects when unauthenticated', async () => {
    supabaseState.user = null
    const res = await onboardingComplete(makeRequest(happyBody))
    expect(res.status).toBe(401)
  })

  it('rejects when career_stage is missing', async () => {
    const res = await onboardingComplete(makeRequest({ ...happyBody, careerStage: undefined }))
    expect(res.status).toBe(400)
  })

  it('rejects when a student graduation date is missing for med-school stage', async () => {
    const res = await onboardingComplete(makeRequest({
      ...happyBody,
      careerStage: 'Y3',
      studentGraduationDate: null,
    }))
    expect(res.status).toBe(400)
  })
})
