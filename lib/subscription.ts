import type { SupabaseClient } from '@supabase/supabase-js'

export type Tier = 'free' | 'pro' | 'student'

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
    studentGraceUntil: string | null
  }
  limits: {
    canExportPdf: boolean
    canCreateShareLink: boolean
    canTrackAnotherSpecialty: boolean
    canBulkImport: boolean
    canUploadFiles: boolean
  }
}

type ProfileData = {
  tier?: string | null
  pro_features_used?: {
    pdf_exports_used?: number
    share_links_used?: number
    referral_pro_until?: string | null
  } | null
  student_grace_until?: string | null
}

type UsageData = {
  specialtiesTracked: number
  storageUsedMB: number
}

export function getSubscriptionInfo(profile: ProfileData, usage: UsageData): SubscriptionInfo {
  const tier = ((profile.tier ?? 'free') as Tier)
  const pfu = profile.pro_features_used ?? {}
  const now = new Date()

  const referralActive =
    pfu.referral_pro_until != null && new Date(pfu.referral_pro_until) > now
  const graceActive =
    profile.student_grace_until != null && new Date(profile.student_grace_until) > now

  const isPro = tier === 'pro' || tier === 'student' || referralActive || graceActive
  const isStudent = tier === 'student'
  const storageQuotaMB = isPro ? 5120 : 100

  const usageObj = {
    pdfExportsUsed: pfu.pdf_exports_used ?? 0,
    shareLinksUsed: pfu.share_links_used ?? 0,
    specialtiesTracked: usage.specialtiesTracked,
    storageUsedMB: usage.storageUsedMB,
    referralProUntil: pfu.referral_pro_until ?? null,
    studentGraceUntil: profile.student_grace_until ?? null,
  }

  return {
    tier,
    isPro,
    isStudent,
    storageQuotaMB,
    usage: usageObj,
    limits: {
      canExportPdf: isPro || usageObj.pdfExportsUsed < 1,
      canCreateShareLink: isPro || usageObj.shareLinksUsed < 1,
      canTrackAnotherSpecialty: isPro || usageObj.specialtiesTracked < 1,
      canBulkImport: isPro,
      canUploadFiles: usageObj.storageUsedMB < storageQuotaMB,
    },
  }
}

export async function fetchSubscriptionInfo(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionInfo> {
  const [
    { data: profile },
    { count: specialtiesTracked },
    { data: files },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('tier, pro_features_used, student_grace_until')
      .eq('id', userId)
      .single(),
    supabase
      .from('specialty_applications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase
      .from('evidence_files')
      .select('file_size')
      .eq('user_id', userId),
  ])

  const storageUsedBytes = (files ?? []).reduce(
    (sum: number, f: { file_size: number | null }) => sum + (f.file_size ?? 0),
    0
  )

  return getSubscriptionInfo(
    profile ?? { tier: 'free', pro_features_used: null, student_grace_until: null },
    { specialtiesTracked: specialtiesTracked ?? 0, storageUsedMB: storageUsedBytes / (1024 * 1024) }
  )
}
