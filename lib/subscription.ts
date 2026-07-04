import type { SupabaseClient } from '@supabase/supabase-js'
import { isMedicalStudentStage } from '@/lib/constants/career-stages'

// Entitlement tiers collapsed to free vs pro (Batch 1). Institutional
// verification and FY1/FY2 are no longer entitlement tiers - they are a
// verification flag and a career stage respectively. `tier` reflects the
// BILLING tier only, and Pro is buy-only: 'pro' means a real (Stripe)
// subscription, and isPro is true iff tier is 'pro' (referral/gift Pro is gone).
export type Tier = 'free' | 'pro'

export interface SubscriptionInfo {
  tier: Tier
  isPro: boolean
  /** Institutionally verified (a .ac.uk student OR an NHS doctor email), not expired. Grants +400 MB (500 MB total). */
  isVerified: boolean
  isMedStudent: boolean
  storageQuotaMB: number
  /** Count of rewarded (vested) referrals where this user is the referrer. Each grants +1 PDF and +1 share. */
  referralCount: number
  usage: {
    pdfExportsUsed: number
    shareLinksUsed: number
    specialtiesTracked: number
    storageUsedMB: number
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

export function isMedStudentStage(careerStage: string | null | undefined) {
  return isMedicalStudentStage(careerStage)
}

// Storage formatting lives with the storage numbers (single source); re-export
// so existing `import { formatStorageQuota } from '@/lib/subscription'` keeps working.
export { formatStorageQuota } from '@/lib/entitlements/limits'

export type PlanProvenance = {
  /** 'stripe' = paid subscription; 'free' = everyone else. Pro is buy-only. */
  state: 'stripe' | 'free'
  label: string
  billingLabel: string
  /** True only for a real Stripe subscription (drives portal vs checkout). */
  hasStripeBilling: boolean
}

// Single source of truth for how a user's Pro state is presented (F-029/F-003).
// Pro is buy-only now, so effective Pro == a Stripe subscription: Pro users
// manage billing, everyone else upgrades. (No referral/gift Pro state exists.)
export function planProvenance(
  subInfo: Pick<SubscriptionInfo, 'tier' | 'isPro'>,
): PlanProvenance {
  if (subInfo.isPro) {
    return { state: 'stripe', label: 'Pro', billingLabel: 'Manage billing', hasStripeBilling: true }
  }
  return { state: 'free', label: 'Free', billingLabel: 'Upgrade to Pro', hasStripeBilling: false }
}

type EntitlementRow = {
  tier: string | null
  is_pro: boolean | null
  is_student: boolean | null
  storage_quota_mb: number | null
  pdf_exports_used: number | null
  share_links_used: number | null
  specialties_tracked: number | null
  storage_used_mb: number | null
  student_graduation_date: string | null
  can_export_pdf: boolean | null
  can_create_share_link: boolean | null
  can_track_another_specialty: boolean | null
  can_bulk_import: boolean | null
  can_upload_files: boolean | null
  referral_count: number | null
}

function mapEntitlements(row: EntitlementRow | null, careerStage?: string | null): SubscriptionInfo {
  return {
    tier: row?.tier === 'pro' ? 'pro' : 'free',
    isPro: row?.is_pro ?? false,
    // is_student is repurposed by get_profile_entitlements to mean "institutionally
    // verified (either route)". Renamed here to isVerified to avoid confusion.
    isVerified: row?.is_student ?? false,
    isMedStudent: isMedStudentStage(careerStage),
    storageQuotaMB: row?.storage_quota_mb ?? 100,
    referralCount: row?.referral_count ?? 0,
    usage: {
      pdfExportsUsed: row?.pdf_exports_used ?? 0,
      shareLinksUsed: row?.share_links_used ?? 0,
      specialtiesTracked: row?.specialties_tracked ?? 0,
      storageUsedMB: row?.storage_used_mb ?? 0,
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
    // mapEntitlements(null) already produces the fail-closed default (free
    // tier, all gated booleans denied), so reuse it instead of duplicating
    // the shape - one place to keep correct if SubscriptionInfo grows.
    return mapEntitlements(null)
  }

  const [{ data: profile }, { count: activeShareLinks }] = await Promise.all([
    supabase
      .from('profiles')
      .select('career_stage')
      .eq('id', userId)
      .maybeSingle<{ career_stage: string | null }>(),
    supabase
      .from('share_links')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('revoked', false)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString()),
  ])

  const mapped = mapEntitlements(data as EntitlementRow | null, profile?.career_stage ?? null)
  const activeShareLinkCount = activeShareLinks ?? mapped.usage.shareLinksUsed

  return {
    ...mapped,
    usage: {
      ...mapped.usage,
      shareLinksUsed: activeShareLinkCount,
    },
    limits: {
      ...mapped.limits,
      // Recompute from a fresh active-link count for race safety. Free users get
      // 1 base share link + 1 per rewarded referral (referralCount); Pro is
      // unlimited. Keep the RPC's answer if it returned NULL (fail-closed).
      canCreateShareLink:
        (data as EntitlementRow | null)?.can_create_share_link == null
          ? mapped.limits.canCreateShareLink
          : mapped.isPro || activeShareLinkCount < 1 + mapped.referralCount,
    },
  }
}
