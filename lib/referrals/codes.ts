import type { SupabaseClient } from '@supabase/supabase-js'

const REFERRAL_CODE_REGEX = /^[A-Z]{5}$/
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function isFiveLetterReferralCode(code: string | null | undefined) {
  return !!code && REFERRAL_CODE_REGEX.test(code)
}

export function createFiveLetterReferralCode() {
  let code = ''
  for (let index = 0; index < 5; index += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return code
}

export async function ensureFiveLetterReferralCode(
  serviceClient: SupabaseClient,
  userId: string,
  currentCode?: string | null
) {
  if (isFiveLetterReferralCode(currentCode)) return currentCode

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const nextCode = createFiveLetterReferralCode()
    const { data: existing } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('referral_code', nextCode)
      .neq('id', userId)
      .maybeSingle()

    if (existing) continue

    const { error } = await serviceClient
      .from('profiles')
      .update({ referral_code: nextCode })
      .eq('id', userId)

    if (error) throw error
    return nextCode
  }

  throw new Error('Could not generate a unique referral code')
}
