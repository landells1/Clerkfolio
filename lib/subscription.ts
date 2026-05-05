import type { SupabaseClient } from '@supabase/supabase-js'

export type Tier = 'free' | 'student' | 'foundation' | 'pro'

export interface SubscriptionInfo {
  tier: Tier
  isPro: boolean
  isStudent: boolean
  storageQuotaMB: number
  usage: {
    pdfExportsUsed: number
    shareLinksUsed: number
    specialtiesTracked: number
    storageUsedMB: number
    referralProUntil: string | null
    studentGraduationDate: string | null
  }
  limits: {
    canExportPdf: boolean
    canCreateShareLink: boolean
    canTrackAnotherSpecialty: boolean
    canBulkImport: boolean
    canUploadFiles: boolean
  }
}

type EntitlementRow = {
  tier: Tier | null
  is_pro: boolean | null
  is_student: boolean | null
  storage_quota_mb: number | null
  pdf_exports_used: number | null
  share_links_used: number | null
  specialties_tracked: number | null
  storage_used_mb: number | null
  referral_pro_until: string | null
  student_graduation_date: string | null
  can_export_pdf: boolean | null
  can_create_share_link: boolean | null
  can_track_another_specialty: boolean | null
  can_bulk_import: boolean | null
  can_upload_files: boolean | null
}

function mapEntitlements(row: EntitlementRow | null): SubscriptionInfo {
  const tier = row?.tier ?? 'free'
  return {
    tier,
    isPro: row?.is_pro ?? false,
    isStudent: row?.is_student ?? false,
    storageQuotaMB: row?.storage_quota_mb ?? 100,
    usage: {
      pdfExportsUsed: row?.pdf_exports_used ?? 0,
      shareLinksUsed: row?.share_links_used ?? 0,
      specialtiesTracked: row?.specialties_tracked ?? 0,
      storageUsedMB: row?.storage_used_mb ?? 0,
      referralProUntil: row?.referral_pro_until ?? null,
      studentGraduationDate: row?.student_graduation_date ?? null,
    },
    // Fail-closed defaults: if the entitlement row exists but a particular
    // boolean is NULL (schema drift, migration in flight), deny the gated
    // feature instead of granting it. The RPC owns the authoritative answer;
    // anything else is treated as "unknown, deny".
    limits: {
      canExportPdf: row?.can_export_pdf ?? false,
      canCreateShareLink: row?.can_create_share_link ?? false,
      canTrackAnotherSpecialty: row?.can_track_another_specialty ?? false,
      canBulkImport: row?.can_bulk_import ?? false,
      canUploadFiles: row?.can_upload_files ?? false,
    },
  }
}

export async function fetchSubscriptionInfo(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionInfo> {
  const { data, error } = await supabase
    .rpc('get_profile_entitlements', { p_user_id: userId })
    .single()

  if (error) {
    console.error('fetchSubscriptionInfo RPC failed:', error.message)
    return {
      tier: 'free',
      isPro: false,
      isStudent: false,
      storageQuotaMB: 100,
      usage: {
        pdfExportsUsed: 0,
        shareLinksUsed: 0,
        specialtiesTracked: 0,
        storageUsedMB: 0,
        referralProUntil: null,
        studentGraduationDate: null,
      },
      limits: {
        canExportPdf: false,
        canCreateShareLink: false,
        canTrackAnotherSpecialty: false,
        canBulkImport: false,
        canUploadFiles: false,
      },
    }
  }

  return mapEntitlements(data as EntitlementRow | null)
}
