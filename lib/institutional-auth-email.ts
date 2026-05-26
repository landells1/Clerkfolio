import type { SupabaseClient, User } from '@supabase/supabase-js'
import { isInstitutionEmail, normaliseEmail } from '@/lib/institutional-email'
import { grantEligibleReferralReward, grantPendingReferralRewardsForReferrer } from '@/lib/referrals/rewards'

export type InstitutionalAuthEmailClaimStatus =
  | 'not_eligible'
  | 'already_verified'
  | 'verified'
  | 'conflict'
  | 'profile_missing'

export async function claimVerifiedInstitutionalAuthEmail(
  service: SupabaseClient,
  user: Pick<User, 'id' | 'email'>
): Promise<InstitutionalAuthEmailClaimStatus> {
  const signupEmail = normaliseEmail(user.email)
  if (!isInstitutionEmail(signupEmail)) return 'not_eligible'

  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('student_email, student_email_verified')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) return 'profile_missing'
  if (profile.student_email_verified) return 'already_verified'

  const noInstitutionalSet = !profile.student_email || normaliseEmail(profile.student_email) === signupEmail
  if (!noInstitutionalSet) return 'conflict'

  const { data: existingVerifiedProfile } = await service
    .from('profiles')
    .select('id')
    .eq('student_email_verified', true)
    .eq('student_email', signupEmail)
    .neq('id', user.id)
    .maybeSingle()

  if (existingVerifiedProfile) return 'conflict'

  const now = new Date()
  const dueAt = new Date(now)
  dueAt.setFullYear(dueAt.getFullYear() + 1)

  const { error: updateError } = await service
    .from('profiles')
    .update({
      student_email: signupEmail,
      student_email_verified: true,
      student_email_verified_at: now.toISOString(),
      student_email_verification_due_at: dueAt.toISOString().split('T')[0],
    })
    .eq('id', user.id)

  if (updateError) throw updateError

  const { error: tierError } = await service.rpc('recompute_profile_tier', { p_user_id: user.id })
  if (tierError) throw tierError

  await grantEligibleReferralReward(service, user.id)
  await grantPendingReferralRewardsForReferrer(service, user.id)
  return 'verified'
}
