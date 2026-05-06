import type { SupabaseClient } from '@supabase/supabase-js'
import { isMedStudentStage } from '@/lib/subscription'

const FOUNDATION_STAGES = new Set(['FY1', 'FY2', 'POST_FY'])
const FOUNDATION_GIFT_DAYS = 90

type FoundationGiftProfile = {
  career_stage: string | null
  foundation_gift_granted_at: string | null
  pro_features_used: Record<string, unknown> | null
}

function addGiftDays(existing?: string | null) {
  const existingDate = existing ? new Date(existing) : null
  const base = existingDate && existingDate.getTime() > Date.now() ? existingDate : new Date()
  base.setDate(base.getDate() + FOUNDATION_GIFT_DAYS)
  return base.toISOString()
}

function mergeUsage(usage: Record<string, unknown> | null, referralProUntil: string) {
  return {
    pdf_exports_used: Number(usage?.pdf_exports_used ?? 0),
    share_links_used: Number(usage?.share_links_used ?? 0),
    referral_pro_until: referralProUntil,
  }
}

export function isFoundationStage(careerStage: string | null | undefined) {
  return FOUNDATION_STAGES.has(careerStage ?? '')
}

export async function grantFoundationGiftIfEligible(
  supabase: SupabaseClient,
  userId: string,
  previousCareerStage?: string | null
) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('career_stage, foundation_gift_granted_at, pro_features_used')
    .eq('id', userId)
    .maybeSingle<FoundationGiftProfile>()

  if (error || !profile) {
    return { granted: false, reason: 'profile_unavailable' as const, referralProUntil: null, foundationGiftGrantedAt: null }
  }

  if (!isFoundationStage(profile.career_stage)) {
    return { granted: false, reason: 'not_foundation_stage' as const, referralProUntil: null, foundationGiftGrantedAt: null }
  }

  if (previousCareerStage != null && !isMedStudentStage(previousCareerStage)) {
    return { granted: false, reason: 'not_med_school_transition' as const, referralProUntil: null, foundationGiftGrantedAt: null }
  }

  if (profile.foundation_gift_granted_at) {
    return {
      granted: true,
      reason: 'already_granted' as const,
      referralProUntil: (profile.pro_features_used?.referral_pro_until as string | null) ?? null,
      foundationGiftGrantedAt: profile.foundation_gift_granted_at,
    }
  }

  const referralProUntil = addGiftDays((profile.pro_features_used?.referral_pro_until as string | null) ?? null)
  const foundationGiftGrantedAt = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      foundation_gift_granted_at: foundationGiftGrantedAt,
      pro_features_used: mergeUsage(profile.pro_features_used, referralProUntil),
    })
    .eq('id', userId)
    .is('foundation_gift_granted_at', null)

  if (updateError) {
    return { granted: false, reason: 'update_failed' as const, referralProUntil: null, foundationGiftGrantedAt: null }
  }

  return {
    granted: true,
    reason: 'granted' as const,
    referralProUntil,
    foundationGiftGrantedAt,
  }
}
