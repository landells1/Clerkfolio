import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { validateOrigin } from '@/lib/csrf'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ensureFiveLetterReferralCode } from '@/lib/referrals/codes'

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', user.id)
    .single()

  const serviceClient = createServiceClient()
  const code = await ensureFiveLetterReferralCode(serviceClient, user.id, profile?.referral_code)

  return NextResponse.json({ code })
}
