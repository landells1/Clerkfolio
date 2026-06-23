import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSubscriptionInfo } from '@/lib/subscription'

export const dynamic = 'force-dynamic'

// Lightweight current-user storage usage/quota for the evidence dropzone meter
// (F-040). Returns only the two numbers the meter needs - no entitlement
// booleans or other account data.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subInfo = await fetchSubscriptionInfo(supabase, user.id)
  return NextResponse.json({
    usedMB: subInfo.usage.storageUsedMB,
    quotaMB: subInfo.storageQuotaMB,
  })
}
