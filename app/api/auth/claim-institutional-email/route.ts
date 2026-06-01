import { NextRequest, NextResponse } from 'next/server'
import { validateOrigin } from '@/lib/csrf'
import { claimVerifiedInstitutionalAuthEmail } from '@/lib/institutional-auth-email'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email_confirmed_at) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const status = await claimVerifiedInstitutionalAuthEmail(createServiceClient(), user)
    if (status === 'conflict') {
      return NextResponse.json({ status }, { status: 409 })
    }
    return NextResponse.json({ status })
  } catch {
    return NextResponse.json({ error: 'Could not apply institutional email verification.' }, { status: 500 })
  }
}
