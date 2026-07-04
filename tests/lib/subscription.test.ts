// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { isMedStudentStage, fetchSubscriptionInfo, planProvenance, formatStorageQuota, type SubscriptionInfo } from '@/lib/subscription'

describe('isMedStudentStage', () => {
  it.each(['Y1', 'Y2', 'Y3', 'Y4', 'Y5_PLUS'])(
    'returns true for %s',
    stage => expect(isMedStudentStage(stage)).toBe(true),
  )

  // Y5/Y6 are retired legacy values: removed from every allowlist in the
  // career-stage unification (no profile rows held them).
  it.each(['FY1', 'FY2', 'ST1', 'ST3', 'GP', 'POST_FY', 'Y5', 'Y6', ''])(
    'returns false for %s',
    stage => expect(isMedStudentStage(stage)).toBe(false),
  )

  it('returns false for null and undefined', () => {
    expect(isMedStudentStage(null)).toBe(false)
    expect(isMedStudentStage(undefined)).toBe(false)
  })
})

describe('formatStorageQuota — base-ten units', () => {
  it.each([
    [100, '100 MB'],
    [600, '600 MB'],
    [850, '850 MB'],
    [5000, '5 GB'],
    [5500, '5.5 GB'],
    [5750, '5.75 GB'],
  ])('formats %i MB as %s', (mb, label) => {
    expect(formatStorageQuota(mb)).toBe(label)
  })
})

describe('planProvenance', () => {
  const base = (over: Partial<SubscriptionInfo>): SubscriptionInfo => ({
    tier: 'free', isPro: false, isVerified: false, isMedStudent: false,
    storageQuotaMB: 100, referralCount: 0,
    usage: { pdfExportsUsed: 0, shareLinksUsed: 0, specialtiesTracked: 0, storageUsedMB: 0, studentGraduationDate: null },
    limits: { canExportPdf: true, canCreateShareLink: true, canTrackAnotherSpecialty: true, canBulkImport: false, canUploadFiles: true },
    ...over,
  })

  it('marks a Stripe subscriber as billing-managed (Pro is buy-only)', () => {
    const p = planProvenance(base({ tier: 'pro', isPro: true }))
    expect(p.state).toBe('stripe')
    expect(p.hasStripeBilling).toBe(true)
    expect(p.billingLabel).toBe('Manage billing')
  })

  it('marks a free user as upgrade', () => {
    const p = planProvenance(base({}))
    expect(p.state).toBe('free')
    expect(p.hasStripeBilling).toBe(false)
    expect(p.billingLabel).toBe('Upgrade to Pro')
  })
})

describe('fetchSubscriptionInfo — fail-closed on RPC error', () => {
  it('returns free/deny-all defaults when the RPC errors', async () => {
    const mockSupabase = {
      rpc: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }),
    }

    const result = await fetchSubscriptionInfo(mockSupabase as never, 'user-123')

    expect(result.tier).toBe('free')
    expect(result.isPro).toBe(false)
    expect(result.isVerified).toBe(false)
    expect(result.limits.canExportPdf).toBe(false)
    expect(result.limits.canCreateShareLink).toBe(false)
    expect(result.limits.canBulkImport).toBe(false)
    expect(result.limits.canUploadFiles).toBe(false)
    expect(result.storageQuotaMB).toBe(100)
  })
})

describe('fetchSubscriptionInfo — entitlement mapping', () => {
  function makeSupabase(row: Record<string, unknown> | null, careerStage: string | null = null) {
    const profileQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: careerStage ? { career_stage: careerStage } : null,
            error: null,
          }),
        }),
      }),
    }
    const shareLinksQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gt: vi.fn().mockResolvedValue({ count: Number(row?.share_links_used ?? 0), error: null }),
      }),
    }

    return {
      rpc: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: row, error: null }),
      }),
      from: vi.fn((table: string) => table === 'share_links' ? shareLinksQuery : profileQuery),
    }
  }

  it('maps a fully-populated Pro row', async () => {
    const row = {
      tier: 'pro', is_pro: true, is_student: false,
      storage_quota_mb: 5000, pdf_exports_used: 2, share_links_used: 1,
      specialties_tracked: 3, storage_used_mb: 50,
      student_graduation_date: null,
      can_export_pdf: true, can_create_share_link: true,
      can_track_another_specialty: true, can_bulk_import: true, can_upload_files: true,
      referral_count: 0,
    }

    const result = await fetchSubscriptionInfo(makeSupabase(row, 'FY1') as never, 'user-1')

    expect(result.tier).toBe('pro')
    expect(result.isPro).toBe(true)
    expect(result.isMedStudent).toBe(false)
    expect(result.storageQuotaMB).toBe(5000)
    expect(result.usage.pdfExportsUsed).toBe(2)
    expect(result.limits.canBulkImport).toBe(true)
  })

  it('maps is_student to isVerified and flags isMedStudent by career stage', async () => {
    const row = {
      tier: 'free', is_pro: false, is_student: true,
      storage_quota_mb: 600, pdf_exports_used: 0, share_links_used: 0,
      specialties_tracked: 0, storage_used_mb: 0,
      student_graduation_date: '2027-07-01',
      can_export_pdf: false, can_create_share_link: true,
      can_track_another_specialty: true, can_bulk_import: false, can_upload_files: true,
      referral_count: 0,
    }

    const result = await fetchSubscriptionInfo(makeSupabase(row, 'Y3') as never, 'user-2')

    expect(result.isVerified).toBe(true)
    expect(result.isMedStudent).toBe(true)
    expect(result.storageQuotaMB).toBe(600)
    expect(result.usage.studentGraduationDate).toBe('2027-07-01')
  })

  it('extends the free share-link allowance by referral count', async () => {
    // Free user with 2 rewarded referrals => allowance 1 + 2 = 3 active links.
    const row = {
      tier: 'free', is_pro: false, is_student: false,
      storage_quota_mb: 100, pdf_exports_used: 0, share_links_used: 2,
      specialties_tracked: 0, storage_used_mb: 0,
      student_graduation_date: null,
      can_export_pdf: true, can_create_share_link: true,
      can_track_another_specialty: false, can_bulk_import: false, can_upload_files: true,
      referral_count: 2,
    }

    const result = await fetchSubscriptionInfo(makeSupabase(row) as never, 'user-ref')

    expect(result.referralCount).toBe(2)
    // 2 active < 1 + 2 = 3 -> can still create another.
    expect(result.limits.canCreateShareLink).toBe(true)
  })

  it('blocks a new share link once the referral-extended allowance is full', async () => {
    const row = {
      tier: 'free', is_pro: false, is_student: false,
      storage_quota_mb: 100, pdf_exports_used: 0, share_links_used: 3,
      specialties_tracked: 0, storage_used_mb: 0,
      student_graduation_date: null,
      can_export_pdf: true, can_create_share_link: false,
      can_track_another_specialty: false, can_bulk_import: false, can_upload_files: true,
      referral_count: 2,
    }

    const result = await fetchSubscriptionInfo(makeSupabase(row) as never, 'user-ref2')

    // 3 active >= 1 + 2 = 3 -> blocked.
    expect(result.limits.canCreateShareLink).toBe(false)
  })

  // Fail-closed: null booleans in the entitlement row must deny the feature.
  it('denies limits when entitlement booleans are NULL (schema drift guard)', async () => {
    const row = {
      tier: 'pro', is_pro: true, is_student: false,
      storage_quota_mb: 5000, pdf_exports_used: 0, share_links_used: 0,
      specialties_tracked: 0, storage_used_mb: 0,
      student_graduation_date: null,
      can_export_pdf: null, can_create_share_link: null,
      can_track_another_specialty: null, can_bulk_import: null, can_upload_files: null,
      referral_count: null,
    }

    const result = await fetchSubscriptionInfo(makeSupabase(row) as never, 'user-3')

    expect(result.limits.canExportPdf).toBe(false)
    expect(result.limits.canCreateShareLink).toBe(false)
    expect(result.limits.canTrackAnotherSpecialty).toBe(false)
    expect(result.limits.canBulkImport).toBe(false)
    expect(result.limits.canUploadFiles).toBe(false)
  })

  it('handles a null entitlement row (no profile row yet)', async () => {
    const result = await fetchSubscriptionInfo(makeSupabase(null) as never, 'user-4')

    expect(result.tier).toBe('free')
    expect(result.storageQuotaMB).toBe(100)
    expect(result.limits.canExportPdf).toBe(false)
  })
})
