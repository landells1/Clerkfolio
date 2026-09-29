import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCronSecret } from '@/lib/cron'
import { buildActiveWeekCache } from '@/lib/engagement/streaks'
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
  // weeks at read time, and the dashboard merges today's rows live). The old
  // loop over EVERY profile - unpaged, 3 queries each - would time out as the
  // user base grew and left later users' caches stale.
  const changedSince = new Date(Date.now() - 2 * 86_400_000).toISOString()
  const changedReads = await Promise.all(['portfolio_entries', 'cases'].flatMap(table => [
    fetchAllRows<{ user_id: string }>((from, to) => supabase.from(table).select('user_id').gte('created_at', changedSince).order('id').range(from, to)),
    fetchAllRows<{ user_id: string }>((from, to) => supabase.from(table).select('user_id').gte('deleted_at', changedSince).order('id').range(from, to)),
  ]))
  const profileError = changedReads.find(read => read.error)?.error
  if (profileError) {
    logBackgroundJobError('cron.streak-cache.profiles', profileError)
    return NextResponse.json({ ok: false, error: 'profile_fetch_failed' }, { status: 500 })
  }
  const profiles = Array.from(new Set(changedReads.flatMap(read => (read.data ?? []).map(row => row.user_id))))
    .map(id => ({ id }))

  const since = new Date()
  since.setUTCDate(since.getUTCDate() - 370)
  let updated = 0

  for (const profile of profiles) {
    const [{ data: portfolioRows }, { data: caseRows }] = await Promise.all([
      supabase
        .from('portfolio_entries')
        .select('created_at')
        .eq('user_id', profile.id)
        .is('deleted_at', null)
        .eq('is_demo', false)
        .gte('created_at', since.toISOString()),
      supabase
        .from('cases')
        .select('created_at')
        .eq('user_id', profile.id)
        .is('deleted_at', null)
        .eq('is_demo', false)
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
  }, {
    schedule: { type: 'crontab', value: '0 2 * * *' },
    timezone: 'UTC',
    checkinMargin: 5,
    maxRuntime: 60,
    failureIssueThreshold: 1,
  })
}
