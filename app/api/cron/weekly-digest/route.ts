import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCronSecret } from '@/lib/cron'
import { buildDigestSummary, isDigestEmpty, type DigestEntry } from '@/lib/engagement/digest'
import { previousLondonWeekWindow, londonDateKey } from '@/lib/engagement/streaks'
import { weeklyDigestEmail } from '@/lib/notifications/email-templates'
import { unsubscribeUrl } from '@/lib/notifications/unsubscribe'
import { processInBatches } from '@/lib/utils/batch'
import * as Sentry from '@sentry/nextjs'
import { logBackgroundJobError } from '@/lib/monitoring'
import { sendEmail } from '@/lib/email/send'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Resend allows a few requests a second; sendEmail retries rate-limit errors,
// but keep concurrency low so a digest run does not rely on retries.
const EMAIL_CONCURRENCY = 2

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
  const { start, end } = previousLondonWeekWindow()

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
    // Defence-in-depth: the profile set here is already pre-filtered to users
    // with activity this week (see fetchWindowEntriesByUser), but guard the
    // send directly too so this stays true if that query ever changes.
    if (isDigestEmpty(summary)) return
    const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)
    if (!user?.email) return
    // Never email an account that has not confirmed its address yet: a
    // pre-verification signup should receive nothing but the confirmation mail.
    if (!user.email_confirmed_at) return

    const unsub = unsubscribeUrl(profile.id, 'weekly_digest')
    const email = weeklyDigestEmail(profile.first_name, summary, unsub ?? undefined)
    const result = await sendEmail(resend, {
      from: 'Clerkfolio <hello@clerkfolio.co.uk>',
      to: user.email,
      subject: 'Your weekly Clerkfolio digest',
      text: email.text,
      html: email.html,
      ...(unsub
        ? { headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }
        : {}),
    })
    if (result.ok) sent++
    else logBackgroundJobError('cron.weekly-digest.email', new Error(result.error), { userId: profile.id, code: result.code })
  })

  return NextResponse.json({ ok: true, sent })
  }, {
    schedule: { type: 'crontab', value: '0 9 * * 1' },
    timezone: 'UTC',
    checkinMargin: 5,
    maxRuntime: 60,
    failureIssueThreshold: 1,
  })
}

// Entries and cases DATED inside the window (their own date column, not when
// they were typed in - lib/dashboard/date-stats.ts), so the digest describes
// work done that period and a big backfill is not reported as one week's work.
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
      .eq('is_demo', false)
      .gte('date', londonDateKey(start))
      .lt('date', londonDateKey(end)),
    supabase
      .from('cases')
      .select('user_id, specialty_tags')
      .is('deleted_at', null)
      .eq('is_demo', false)
      .gte('date', londonDateKey(start))
      .lt('date', londonDateKey(end)),
  ])

  const byUser = new Map<string, DigestEntry[]>()
  for (const row of [...(portfolioRows ?? []), ...(caseRows ?? [])] as (DigestEntry & { user_id: string })[]) {
    const list = byUser.get(row.user_id) ?? []
    list.push(row)
    byUser.set(row.user_id, list)
  }
  return byUser
}
