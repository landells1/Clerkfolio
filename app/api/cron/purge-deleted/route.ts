import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCronSecret } from '@/lib/cron'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const cronError = validateCronSecret(request)
  if (cronError) return cronError

  const supabase = createServiceClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const [{ error: casesError }, { error: entriesError }] = await Promise.all([
    supabase.from('cases').delete().lt('deleted_at', thirtyDaysAgo).not('deleted_at', 'is', null),
    supabase.from('portfolio_entries').delete().lt('deleted_at', thirtyDaysAgo).not('deleted_at', 'is', null),
  ])

  if (casesError || entriesError) {
    return NextResponse.json({ error: casesError?.message ?? entriesError?.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
