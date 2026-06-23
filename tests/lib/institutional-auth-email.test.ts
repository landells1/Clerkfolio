import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { claimVerifiedInstitutionalAuthEmail } from '@/lib/institutional-auth-email'
import { markReferralActivationIfEligible, processReferralsForReferrer } from '@/lib/referrals/rewards'

vi.mock('@/lib/referrals/rewards', () => ({
  markReferralActivationIfEligible: vi.fn(async () => ({ activated: false, reason: 'no_referrer' })),
  processReferralsForReferrer: vi.fn(async () => []),
}))

function makeService({
  profile = { student_email: null, student_email_verified: false },
  existingProfile = null as { id: string } | null,
} = {}) {
  const update = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }))
  const rpc = vi.fn(async () => ({ error: null }))
  const service = {
    from: vi.fn((table: string) => {
      if (table !== 'profiles') throw new Error(`Unexpected table: ${table}`)
      const query = {
        eq: vi.fn(() => query),
        neq: vi.fn(() => query),
        single: vi.fn(async () => ({ data: profile, error: null })),
        maybeSingle: vi.fn(async () => ({ data: existingProfile, error: null })),
      }
      return {
        select: vi.fn(() => query),
        update,
      }
    }),
    rpc,
  }
  return { service: service as unknown as SupabaseClient, update, rpc }
}

beforeEach(() => vi.clearAllMocks())

describe('claimVerifiedInstitutionalAuthEmail', () => {
  it('does nothing for a non-institutional confirmed signup email', async () => {
    const { service, update } = makeService()
    const status = await claimVerifiedInstitutionalAuthEmail(service, { id: 'user-id', email: 'doctor@example.com' })

    expect(status).toBe('not_eligible')
    expect(update).not.toHaveBeenCalled()
  })

  it('refuses an institutional email already verified on another profile', async () => {
    const { service, update } = makeService({ existingProfile: { id: 'other-id' } })
    const status = await claimVerifiedInstitutionalAuthEmail(service, { id: 'user-id', email: 'student@university.ac.uk' })

    expect(status).toBe('conflict')
    expect(update).not.toHaveBeenCalled()
  })

  it('records a verified institutional signup email and recomputes tier', async () => {
    const { service, update, rpc } = makeService()
    const status = await claimVerifiedInstitutionalAuthEmail(service, { id: 'user-id', email: 'doctor@nhs.net' })

    expect(status).toBe('verified')
    expect(update).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('recompute_profile_tier', { p_user_id: 'user-id' })
    expect(markReferralActivationIfEligible).toHaveBeenCalledWith(service, 'user-id')
    expect(processReferralsForReferrer).toHaveBeenCalledWith(service, 'user-id')
  })
})
