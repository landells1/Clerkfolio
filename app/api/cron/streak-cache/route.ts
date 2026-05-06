import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCronSecret } from '@/lib/cron'
import { buildActiveWeekCache } from '@/lib/engagement/streaks'
import { logBackgroundJobError } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const cronError = validateCronSecret(req)
  if (cronError) return cronError

  const supabase = createServiceClient()
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id')

  if (profileError) {
    logBackgroundJobError('cron.streak-cache.profiles', profileError)
    return NextResponse.json({ ok: false, error: 'profile_fetch_failed' }, { status: 500 })
  }

  const since = new Date()
  since.setUTCDate(since.getUTCDate() - 370)
  let updated = 0

  for (const profile of profiles ?? []) {
    const [{ data: portfolioRows }, { data: caseRows }] = await Promise.all([
      supabase
        .from('portfolio_entries')
        .select('created_at')
        .eq('user_id', profile.id)
        .is('deleted_at', null)
        .gte('created_at', since.toISOString()),
      supabase
        .from('cases')
        .select('created_at')
        .eq('user_id', profile.id)
        .is('deleted_at', null)
        .gte('created_at', since.toISOString()),
    ])

    const activeWeeks = buildActiveWeekCache([
      ...(portfolioRows ?? []).map(row => row.created_at),
      ...(caseRows ?? []).map(row => row.created_at),
    ])

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        streak_cache: {
          active_weeks: activeWeeks,
          updated_at: new Date().toISOString(),
        },
      })
      .eq('id', profile.id)

    if (updateError) {
      logBackgroundJobError('cron.streak-cache.update', updateError, { userId: profile.id })
      continue
    }
    updated++
  }

  return NextResponse.json({ ok: true, updated })
}
