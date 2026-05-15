import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCronSecret } from '@/lib/cron'
import * as Sentry from '@sentry/nextjs'
import { logBackgroundJobError } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const cronError = validateCronSecret(req)
  if (cronError) return cronError

  return Sentry.withMonitor('cron-year-in-review', async () => {
  const supabase = createServiceClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, notification_preferences')

  const resendKey = process.env.RESEND_API_KEY
  let emailed = 0
  let skipped = 0
  if (resendKey && profiles?.length) {
    const resend = new Resend(resendKey)
    const yearStart = new Date()
    yearStart.setUTCFullYear(yearStart.getUTCFullYear() - 1)
    yearStart.setUTCMonth(0, 1)
    yearStart.setUTCHours(0, 0, 0, 0)
    const yearEnd = new Date(yearStart)
    yearEnd.setUTCFullYear(yearEnd.getUTCFullYear() + 1)

    for (const profile of profiles) {
      const prefs = (profile.notification_preferences ?? {}) as { year_in_review?: boolean }
      // Opt-in only - this is a marketing/recap email, so PECR requires consent.
      if (prefs.year_in_review !== true) { skipped++; continue }

      // Only email users who actually logged something in the prior year.
      // Suppresses "your year in review is ready" emails to dormant accounts.
      const { count } = await supabase
        .from('portfolio_entries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .gte('created_at', yearStart.toISOString())
        .lt('created_at', yearEnd.toISOString())
        .is('deleted_at', null)

      if (!count) { skipped++; continue }

      const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)
      if (!user?.email) { skipped++; continue }
      try {
        await resend.emails.send({
          from: 'Clerkfolio <hello@clerkfolio.co.uk>',
          to: user.email,
          subject: 'Your Clerkfolio year in review is ready',
          text: `Hi ${profile.first_name ?? 'there'}, your year-in-review PDF is ready in Clerkfolio under Export > Data backup.`,
          html: `<p>Hi ${profile.first_name ?? 'there'},</p><p>Your year-in-review PDF is ready in Clerkfolio under <strong>Export &gt; Data backup</strong>.</p>`,
        })
        emailed += 1
      } catch (error) {
        logBackgroundJobError('cron.year-in-review.email', error, { userId: profile.id })
      }
    }
  }

  return NextResponse.json({ ok: true, users: profiles?.length ?? 0, emailed, skipped })
  }, {
    schedule: { type: 'crontab', value: '0 9 2 1 *' },
    timezone: 'UTC',
    checkinMargin: 5,
    maxRuntime: 60,
    failureIssueThreshold: 1,
  })
}
