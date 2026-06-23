import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCronSecret } from '@/lib/cron'
import { buildDigestSummary, type DigestEntry } from '@/lib/engagement/digest'
import { currentLondonWeekWindow } from '@/lib/engagement/streaks'
import { weeklyDigestEmail } from '@/lib/notifications/email-templates'
import { processInBatches } from '@/lib/utils/batch'
import * as Sentry from '@sentry/nextjs'
import { logBackgroundJobError } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const EMAIL_CONCURRENCY = 5

type Preferences = {
  weekly_digest?: boolean
}

type ProfileRow = {
  id: string
  first_name: string | null
  notification_preferences: Preferences | null
  streak_cache: { active_weeks?: string[] } | null
}

export async function GET(req: NextRequest) {
  const cronError = validateCronSecret(req)
  if (cronError) return cronError

  return Sentry.withMonitor('cron-weekly-digest', async () => {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ ok: true, sent: 0, skipped: 'missing_resend_key' })

  const supabase = createServiceClient()
  const resend = new Resend(resendKey)
  const { start, end } = currentLondonWeekWindow()

  // Two grouped queries for the whole window instead of two per profile.
  // Users with no activity this week never appear here, so they are never
  // emailed - a "0 entries, 0 green/amber/red" digest is retention noise.
  const entriesByUser = await fetchWindowEntriesByUser(supabase, start, end)
  const userIds = Array.from(entriesByUser.keys())
  if (userIds.length === 0) return NextResponse.json({ ok: true, sent: 0 })

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, first_name, notification_preferences, streak_cache')
    .in('id', userIds)

  if (profileError) {
    logBackgroundJobError('cron.weekly-digest.profiles', profileError)
    return NextResponse.json({ ok: false, error: 'profile_fetch_failed' }, { status: 500 })
  }

  let sent = 0
  const recipients = ((profiles ?? []) as ProfileRow[])
    .filter(profile => profile.notification_preferences?.weekly_digest !== false)

  await processInBatches(recipients, EMAIL_CONCURRENCY, async profile => {
    const entries = entriesByUser.get(profile.id) ?? []
    const activeWeeks = profile.streak_cache?.active_weeks ?? []
    const summary = buildDigestSummary(entries, activeWeeks)
    const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)
    if (!user?.email) return

    const email = weeklyDigestEmail(profile.first_name, summary)
    try {
      await resend.emails.send({
        from: 'Clerkfolio <hello@clerkfolio.co.uk>',
        to: user.email,
        subject: 'Your weekly Clerkfolio digest',
        text: email.text,
        html: email.html,
      })
      sent++
    } catch (error) {
      logBackgroundJobError('cron.weekly-digest.email', error, { userId: profile.id })
    }
  })

  return NextResponse.json({ ok: true, sent })
  }, {
    schedule: { type: 'crontab', value: '0 9 * * 6' },
    timezone: 'UTC',
    checkinMargin: 5,
    maxRuntime: 60,
    failureIssueThreshold: 1,
  })
}

async function fetchWindowEntriesByUser(
  supabase: ReturnType<typeof createServiceClient>,
  start: Date,
  end: Date
) {
  const [{ data: portfolioRows }, { data: caseRows }] = await Promise.all([
    supabase
      .from('portfolio_entries')
      .select('user_id, specialty_tags')
      .is('deleted_at', null)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString()),
    supabase
      .from('cases')
      .select('user_id, specialty_tags')
      .is('deleted_at', null)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString()),
  ])

  const byUser = new Map<string, DigestEntry[]>()
  for (const row of [...(portfolioRows ?? []), ...(caseRows ?? [])] as (DigestEntry & { user_id: string })[]) {
    const list = byUser.get(row.user_id) ?? []
    list.push(row)
    byUser.set(row.user_id, list)
  }
  return byUser
}
