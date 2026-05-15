// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { isMedStudentStage, fetchSubscriptionInfo } from '@/lib/subscription'

describe('isMedStudentStage', () => {
  it.each(['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y5_PLUS', 'Y6'])(
    'returns true for %s',
    stage => expect(isMedStudentStage(stage)).toBe(true),
  )

  it.each(['FY1', 'FY2', 'ST1', 'ST3', 'GP', 'POST_FY', ''])(
    'returns false for %s',
    stage => expect(isMedStudentStage(stage)).toBe(false),
  )

  it('returns false for null and undefined', () => {
    expect(isMedStudentStage(null)).toBe(false)
    expect(isMedStudentStage(undefined)).toBe(false)
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
    expect(result.isStudent).toBe(false)
    expect(result.limits.canExportPdf).toBe(false)
    expect(result.limits.canCreateShareLink).toBe(false)
    expect(result.limits.canBulkImport).toBe(false)
    expect(result.limits.canUploadFiles).toBe(false)
    expect(result.storageQuotaMB).toBe(100)
  })
})

describe('fetchSubscriptionInfo — entitlement mapping', () => {
  function makeSupabase(row: Record<string, unknown>, careerStage: string | null = null) {
    return {
      rpc: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: row, error: null }),
      }),
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: careerStage ? { career_stage: careerStage } : null,
              error: null,
            }),
          }),
        }),
      }),
    }
  }

  it('maps a fully-populated Pro row', async () => {
    const row = {
      tier: 'pro', is_pro: true, is_student: false,
      storage_quota_mb: 1000, pdf_exports_used: 2, share_links_used: 1,
      specialties_tracked: 3, storage_used_mb: 50,
      referral_pro_until: null, student_graduation_date: null,
      can_export_pdf: true, can_create_share_link: true,
      can_track_another_specialty: true, can_bulk_import: true, can_upload_files: true,
    }

    const result = await fetchSubscriptionInfo(makeSupabase(row, 'FY1') as never, 'user-1')

    expect(result.tier).toBe('pro')
    expect(result.isPro).toBe(true)
    expect(result.isMedStudent).toBe(false)
    expect(result.storageQuotaMB).toBe(1000)
    expect(result.usage.pdfExportsUsed).toBe(2)
    expect(result.usage.shareLinksUsed).toBe(1)
    expect(result.limits.canExportPdf).toBe(true)
    expect(result.limits.canBulkImport).toBe(true)
    expect(result.limits.canUploadFiles).toBe(true)
  })

  it('flags isMedStudent when career stage is a med-student stage', async () => {
    const row = {
      tier: 'student', is_pro: false, is_student: true,
      storage_quota_mb: 100, pdf_exports_used: 0, share_links_used: 0,
      specialties_tracked: 0, storage_used_mb: 0,
      referral_pro_until: null, student_graduation_date: '2027-07-01',
      can_export_pdf: false, can_create_share_link: true,
      can_track_another_specialty: true, can_bulk_import: false, can_upload_files: false,
    }

    const result = await fetchSubscriptionInfo(makeSupabase(row, 'Y3') as never, 'user-2')

    expect(result.isStudent).toBe(true)
    expect(result.isMedStudent).toBe(true)
    expect(result.usage.studentGraduationDate).toBe('2027-07-01')
  })

  // Fail-closed: null booleans in the entitlement row must deny the feature,
  // not grant it. Guards against schema drift mid-migration.
  it('denies limits when entitlement booleans are NULL (schema drift guard)', async () => {
    const row = {
      tier: 'pro', is_pro: true, is_student: false,
      storage_quota_mb: 1000, pdf_exports_used: 0, share_links_used: 0,
      specialties_tracked: 0, storage_used_mb: 0,
      referral_pro_until: null, student_graduation_date: null,
      can_export_pdf: null, can_create_share_link: null,
      can_track_another_specialty: null, can_bulk_import: null, can_upload_files: null,
    }

    const result = await fetchSubscriptionInfo(makeSupabase(row) as never, 'user-3')

    expect(result.limits.canExportPdf).toBe(false)
    expect(result.limits.canCreateShareLink).toBe(false)
    expect(result.limits.canTrackAnotherSpecialty).toBe(false)
    expect(result.limits.canBulkImport).toBe(false)
    expect(result.limits.canUploadFiles).toBe(false)
  })

  it('handles a null entitlement row (no profile row yet)', async () => {
    const result = await fetchSubscriptionInfo(makeSupabase(null as never) as never, 'user-4')

    expect(result.tier).toBe('free')
    expect(result.storageQuotaMB).toBe(100)
    expect(result.limits.canExportPdf).toBe(false)
  })
})
