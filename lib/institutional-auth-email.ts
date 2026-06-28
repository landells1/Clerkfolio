import type { SupabaseClient, User } from '@supabase/supabase-js'
import { isInstitutionEmail, normaliseEmail } from '@/lib/institutional-email'
import { bindInstitutionalEmail, institutionalEmailBoundElsewhere } from '@/lib/institutional-email-ledger'
import { markReferralActivationIfEligible, processReferralsForReferrer } from '@/lib/referrals/rewards'

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

  // Recycled-email guard (F-037): this address may have been verified by another
  // account in the past and released (e.g. a graduated student's reissued
  // .ac.uk). The ledger binds it permanently, so it cannot be re-claimed here.
  if (await institutionalEmailBoundElsewhere(service, signupEmail, user.id)) return 'conflict'

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

  // Bind the address in the recycled-email ledger so it can't be re-verified by
  // a different account after this user later releases it (F-037).
  await bindInstitutionalEmail(service, signupEmail, user.id)

  // The user just became institution-verified: activate any referrals they
  // received that are already eligible, and (if they are themselves a referred
  // user who has done the meaningful action) activate their own referral.
  await markReferralActivationIfEligible(service, user.id)
  await processReferralsForReferrer(service, user.id)
  return 'verified'
}
