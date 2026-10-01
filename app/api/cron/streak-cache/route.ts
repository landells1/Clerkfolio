import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCronSecret } from '@/lib/cron'
import { londonDateKey } from '@/lib/engagement/streaks'
import { activeWeeksFromRows, addDays } from '@/lib/dashboard/date-stats'
import * as Sentry from '@sentry/nextjs'
import { logBackgroundJobError } from '@/lib/monitoring'
import { fetchAllRows } from '@/lib/supabase/fetch-all'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const cronError = validateCronSecret(req)
  if (cronError) return cronError

  return Sentry.withMonitor('cron-streak-cache', async () => {
  const supabase = createServiceClient()
  // Only users whose entries/cases changed in the last two days can have a
  // different set of active weeks (the streak itself is computed from the
  // weeks at read time; the dashboard computes them live from its own rows).
  // updated_at is trigger-maintained on both tables, so it catches inserts,
  // date edits and soft deletes in one pass. The old loop over EVERY profile -
  // unpaged, 3 queries each - would time out as the user base grew.
  const changedSince = new Date(Date.now() - 2 * 86_400_000).toISOString()
  const changedReads = await Promise.all(['portfolio_entries', 'cases'].map(table =>
    fetchAllRows<{ user_id: string }>((from, to) => supabase.from(table).select('user_id').gte('updated_at', changedSince).order('id').range(from, to)),
  ))
  const profileError = changedReads.find(read => read.error)?.error
  if (profileError) {
    logBackgroundJobError('cron.streak-cache.profiles', profileError)
    return NextResponse.json({ ok: false, error: 'profile_fetch_failed' }, { status: 500 })
  }
  const profiles = Array.from(new Set(changedReads.flatMap(read => (read.data ?? []).map(row => row.user_id))))
    .map(id => ({ id }))

  // Active weeks come from each record's OWN date (not created_at), so a
  // backfilled six months counts in the weeks it happened - the same rule as
  // the dashboard (lib/dashboard/date-stats.ts). Future-dated rows never count.
  const todayKey = londonDateKey(new Date())
  const sinceKey = addDays(todayKey, -370)
  let updated = 0

  for (const profile of profiles) {
    const [{ data: portfolioRows }, { data: caseRows }] = await Promise.all([
      supabase
        .from('portfolio_entries')
        .select('date')
        .eq('user_id', profile.id)
        .is('deleted_at', null)
        .eq('is_demo', false)
        .gte('date', sinceKey)
        .lte('date', todayKey),
      supabase
        .from('cases')
        .select('date')
        .eq('user_id', profile.id)
        .is('deleted_at', null)
        .eq('is_demo', false)
        .gte('date', sinceKey)
        .lte('date', todayKey),
    ])

    const activeWeeks = activeWeeksFromRows([...(portfolioRows ?? []), ...(caseRows ?? [])], todayKey)

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
  }, {
    schedule: { type: 'crontab', value: '0 2 * * *' },
    timezone: 'UTC',
    checkinMargin: 5,
    maxRuntime: 60,
    failureIssueThreshold: 1,
  })
}
