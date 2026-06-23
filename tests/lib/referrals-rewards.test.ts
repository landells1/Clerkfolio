// @vitest-environment node
//
// Pure-logic tests for lib/referrals/rewards.ts (new model). The activation
// decision is a multi-step Supabase dance; we mock the SupabaseClient surface
// to exercise the eligibility tree without a live DB.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { markReferralActivationIfEligible } from '@/lib/referrals/rewards'

type Row = Record<string, unknown>

type Fixture = {
  referred?: Row | null
  existingReferral?: { status: string } | null
  referrer?: Row | null
  caseCount?: number
  entryCount?: number
}

// select('id', { count, head }).eq().eq().is() -> { count }
function countQuery(count: number) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(async () => ({ count, error: null })),
        })),
      })),
    })),
  }
}

function makeService(fixture: Fixture) {
  let profileCall = 0
  const profilesBuilder = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => {
          profileCall += 1
          // 1st profile read = referred user; 2nd = referrer.
          return { data: profileCall === 1 ? fixture.referred ?? null : fixture.referrer ?? null, error: null }
        }),
      })),
    })),
    update: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(async () => ({ data: null, error: null })) })) })),
  }

  const referralsBuilder = {
    upsert: vi.fn(async () => ({ data: null, error: null })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({ data: fixture.existingReferral ?? null, error: null })),
      })),
    })),
    update: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(async () => ({ data: null, error: null })) })) })),
  }

  const service = {
    from: vi.fn((table: string) => {
      if (table === 'profiles') return profilesBuilder
      if (table === 'referrals') return referralsBuilder
      if (table === 'cases') return countQuery(fixture.caseCount ?? 0)
      if (table === 'portfolio_entries') return countQuery(fixture.entryCount ?? 0)
      return countQuery(0)
    }),
  }
  return service as unknown as Parameters<typeof markReferralActivationIfEligible>[0]
}

const futureDueDate = new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0]
const pastDueDate = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]

beforeEach(() => vi.restoreAllMocks())

describe('markReferralActivationIfEligible', () => {
  it('returns no_referrer when the user was not referred', async () => {
    const service = makeService({
      referred: { id: 'referred-id', referred_by: null, onboarding_complete: true },
    })
    const result = await markReferralActivationIfEligible(service, 'referred-id')
    expect(result).toEqual({ activated: false, reason: 'no_referrer' })
  })

  it('is idempotent: already activated/completed is left alone', async () => {
    const service = makeService({
      referred: { id: 'referred-id', referred_by: 'referrer-id', onboarding_complete: true },
      existingReferral: { status: 'completed' },
    })
    const result = await markReferralActivationIfEligible(service, 'referred-id')
    expect(result).toEqual({ activated: false, reason: 'already_activated' })
  })

  it('not eligible when onboarding is incomplete', async () => {
    const service = makeService({
      referred: { id: 'referred-id', referred_by: 'referrer-id', onboarding_complete: false },
      caseCount: 1,
    })
    const result = await markReferralActivationIfEligible(service, 'referred-id')
    expect(result).toEqual({ activated: false, reason: 'referred_not_eligible' })
  })

  it('not eligible with onboarding done but no real case/entry', async () => {
    const service = makeService({
      referred: { id: 'referred-id', referred_by: 'referrer-id', onboarding_complete: true },
      caseCount: 0,
      entryCount: 0,
    })
    const result = await markReferralActivationIfEligible(service, 'referred-id')
    expect(result).toEqual({ activated: false, reason: 'referred_not_eligible' })
  })

  it('requires the referrer to be institution-verified (and not expired)', async () => {
    const service = makeService({
      referred: { id: 'referred-id', referred_by: 'referrer-id', onboarding_complete: true },
      caseCount: 1,
      referrer: { student_email_verified: true, student_email_verification_due_at: pastDueDate },
    })
    const result = await markReferralActivationIfEligible(service, 'referred-id')
    expect(result).toEqual({ activated: false, reason: 'referrer_not_verified' })
  })

  it('treats a null verification due date as expired (referrer not verified)', async () => {
    const service = makeService({
      referred: { id: 'referred-id', referred_by: 'referrer-id', onboarding_complete: true },
      entryCount: 1,
      referrer: { student_email_verified: true, student_email_verification_due_at: null },
    })
    const result = await markReferralActivationIfEligible(service, 'referred-id')
    expect(result).toEqual({ activated: false, reason: 'referrer_not_verified' })
  })

  it('activates when the referred did the meaningful action and the referrer is verified', async () => {
    const service = makeService({
      referred: { id: 'referred-id', referred_by: 'referrer-id', onboarding_complete: true },
      caseCount: 1,
      referrer: { student_email_verified: true, student_email_verification_due_at: futureDueDate },
    })
    const result = await markReferralActivationIfEligible(service, 'referred-id')
    expect(result).toEqual({ activated: true, reason: 'activated' })
  })
})
