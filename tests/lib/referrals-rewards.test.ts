// @vitest-environment node
//
// Pure-logic tests for lib/referrals/rewards.ts. The reward grant is a
// multi-step Supabase dance; we mock the SupabaseClient surface area to
// exercise the eligibility decision tree without needing a live DB.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { grantEligibleReferralReward } from '@/lib/referrals/rewards'

type Row = Record<string, unknown>

function makeFromBuilder(rows: Row[]) {
  // Each .select(...) returns an object whose chained .eq() / .gte() / .maybeSingle()
  // return a promise. We don't enforce filter correctness in unit tests; the
  // outermost caller is responsible for the predicates. Returns a builder
  // that supports the calls referrals/rewards.ts makes.
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data: rows[0] ?? null, error: null })),
    insert: vi.fn(async () => ({ data: null, error: null })),
    update: vi.fn(() => builder),
    upsert: vi.fn(async () => ({ data: null, error: null })),
    delete: vi.fn(() => builder),
  }
  return builder
}

type Fixture = {
  referred?: Row | null
  existingReferral?: Row | null
  referrer?: Row | null
  count?: number
  postCount?: number
}

function makeService(fixture: Fixture) {
  const tableCalls: Record<string, ReturnType<typeof makeFromBuilder>> = {}
  const service = {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        // Two calls in sequence: first reads referred user, second reads referrer
        const profileBuilder = makeFromBuilder([])
        let callIndex = 0
        profileBuilder.maybeSingle = vi.fn(async () => {
          callIndex++
          if (callIndex === 1) return { data: fixture.referred ?? null, error: null }
          return { data: fixture.referrer ?? null, error: null }
        }) as never
        // Profile updates - just return success
        profileBuilder.update = vi.fn(() => ({ eq: vi.fn(async () => ({ data: null, error: null })) })) as never
        tableCalls[table] = profileBuilder
        return profileBuilder
      }
      if (table === 'referrals') {
        const referralBuilder = makeFromBuilder([])
        let selectCount = 0
        referralBuilder.maybeSingle = vi.fn(async () => ({ data: fixture.existingReferral ?? null, error: null })) as never
        // .select('id', { count: 'exact', head: true }) returns { count, error }
        referralBuilder.select = vi.fn((_cols, opts) => {
          if (opts?.head) {
            selectCount++
            return {
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(async () => ({
                    count: selectCount === 1 ? fixture.count ?? 0 : fixture.postCount ?? fixture.count ?? 0,
                    error: null,
                  })),
                })),
              })),
            }
          }
          return referralBuilder
        }) as never
        referralBuilder.upsert = vi.fn(async () => ({ data: null, error: null })) as never
        referralBuilder.update = vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(async () => ({ data: null, error: null })) })) })) as never
        tableCalls[table] = referralBuilder
        return referralBuilder
      }
      const generic = makeFromBuilder([])
      tableCalls[table] = generic
      return generic
    }),
  }
  return service as unknown as Parameters<typeof grantEligibleReferralReward>[0]
}

const futureDueDate = new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0]
const pastDueDate = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]

beforeEach(() => vi.restoreAllMocks())

describe('grantEligibleReferralReward', () => {
  it('returns no_referrer when the user was not referred', async () => {
    const service = makeService({
      referred: {
        id: 'referred-id',
        referred_by: null,
        onboarding_complete: true,
        student_email_verified: true,
        student_email_verification_due_at: futureDueDate,
        pro_features_used: {},
      },
    })
    const result = await grantEligibleReferralReward(service, 'referred-id')
    expect(result.granted).toBe(false)
    expect(result.reason).toBe('no_referrer')
  })

  it('returns already_completed when status is completed', async () => {
    const service = makeService({
      referred: {
        id: 'referred-id',
        referred_by: 'referrer-id',
        onboarding_complete: true,
        student_email_verified: true,
        student_email_verification_due_at: futureDueDate,
        pro_features_used: {},
      },
      existingReferral: { status: 'completed' },
    })
    const result = await grantEligibleReferralReward(service, 'referred-id')
    expect(result.granted).toBe(false)
    expect(result.reason).toBe('already_completed')
  })

  it('returns referred_not_eligible when onboarding is incomplete', async () => {
    const service = makeService({
      referred: {
        id: 'referred-id',
        referred_by: 'referrer-id',
        onboarding_complete: false,
        student_email_verified: true,
        student_email_verification_due_at: futureDueDate,
        pro_features_used: {},
      },
    })
    const result = await grantEligibleReferralReward(service, 'referred-id')
    expect(result.granted).toBe(false)
    expect(result.reason).toBe('referred_not_eligible')
  })

  it('returns referred_not_eligible when institutional verification expired', async () => {
    const service = makeService({
      referred: {
        id: 'referred-id',
        referred_by: 'referrer-id',
        onboarding_complete: true,
        student_email_verified: true,
        student_email_verification_due_at: pastDueDate,
        pro_features_used: {},
      },
    })
    const result = await grantEligibleReferralReward(service, 'referred-id')
    expect(result.granted).toBe(false)
    expect(result.reason).toBe('referred_not_eligible')
  })

  it('#3 regression: null due_at treated as expired (not valid-forever)', async () => {
    // hasCurrentInstitutionVerification must return false when due_at is null,
    // aligning with recompute_profile_tier which also treats null as expired.
    const service = makeService({
      referred: {
        id: 'referred-id',
        referred_by: 'referrer-id',
        onboarding_complete: true,
        student_email_verified: true,
        student_email_verification_due_at: null,
        pro_features_used: {},
      },
    })
    const result = await grantEligibleReferralReward(service, 'referred-id')
    expect(result.granted).toBe(false)
    expect(result.reason).toBe('referred_not_eligible')
  })

  it('returns referrer_cap_reached at 5/year', async () => {
    const service = makeService({
      referred: {
        id: 'referred-id',
        referred_by: 'referrer-id',
        onboarding_complete: true,
        student_email_verified: true,
        student_email_verification_due_at: futureDueDate,
        pro_features_used: {},
      },
      referrer: {
        id: 'referrer-id',
        student_email_verified: true,
        student_email_verification_due_at: futureDueDate,
        pro_features_used: {},
      },
      count: 5,
    })
    const result = await grantEligibleReferralReward(service, 'referred-id')
    expect(result.granted).toBe(false)
    expect(result.reason).toBe('referrer_cap_reached')
  })

  it('grants when everything aligns', async () => {
    const service = makeService({
      referred: {
        id: 'referred-id',
        referred_by: 'referrer-id',
        onboarding_complete: true,
        student_email_verified: true,
        student_email_verification_due_at: futureDueDate,
        pro_features_used: {},
      },
      referrer: {
        id: 'referrer-id',
        student_email_verified: true,
        student_email_verification_due_at: futureDueDate,
        pro_features_used: {},
      },
      count: 2,
      postCount: 3,
    })
    const result = await grantEligibleReferralReward(service, 'referred-id')
    expect(result.granted).toBe(true)
    expect(result.reason).toBe('granted')
  })
})
