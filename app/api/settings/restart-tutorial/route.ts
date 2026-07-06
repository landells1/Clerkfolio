import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'

export async function POST(request: NextRequest) {
  const originError = validateOrigin(request)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const service = createServiceClient()
  const { error } = await service
    .from('profiles')
    .update({
      onboarding_checklist_dismissed: false,
      onboarding_checklist_completed_items: [],
    })
    .eq('id', user.id)

  if (error) {
    console.error('settings/restart-tutorial error:', error.message)
    return NextResponse.json({ error: 'Failed to restart the tutorial. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
