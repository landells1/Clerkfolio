import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCronSecret } from '@/lib/cron'
import * as Sentry from '@sentry/nextjs'
import { logBackgroundJobError } from '@/lib/monitoring'
import { sendEmail } from '@/lib/email/send'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { yearInReviewYear } from '@/lib/engagement/streaks'
import { unsubscribeUrl } from '@/lib/notifications/unsubscribe'

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const cronError = validateCronSecret(req)
  if (cronError) return cronError

  return Sentry.withMonitor('cron-year-in-review', async () => {
  const supabase = createServiceClient()
  // Opt-in only - this is a marketing/recap email, so PECR requires consent.
  // Filter in the query (paged) rather than scanning every profile.
  const { data: profiles } = await fetchAllRows<{ id: string; first_name: string | null }>((from, to) => supabase
    .from('profiles')
    .select('id, first_name')
    .eq('notification_preferences->year_in_review', true)
    .order('id')
    .range(from, to))

  const resendKey = process.env.RESEND_API_KEY
  let emailed = 0
  let skipped = 0
  if (resendKey && profiles?.length) {
    const resend = new Resend(resendKey)
    // The review covers the year that just ended (the export route uses the
    // same yearInReviewYear rule throughout January), by entry DATE.
    const year = yearInReviewYear(new Date())

    for (const profile of profiles) {
      // Only email users who actually logged something in that year, so the
      // PDF they are sent to is not empty. Demo examples don't count.
      const { count } = await supabase
        .from('portfolio_entries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`)
        .is('deleted_at', null)
        .eq('is_demo', false)

      if (!count) { skipped++; continue }

      const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)
      if (!user?.email || !user.email_confirmed_at) { skipped++; continue }
      const unsub = unsubscribeUrl(profile.id, 'year_in_review')
      const name = profile.first_name ?? 'there'
      const result = await sendEmail(resend, {
        from: 'Clerkfolio <hello@clerkfolio.co.uk>',
        to: user.email,
        subject: `Your Clerkfolio ${year} year in review is ready`,
        text: [
          `Hi ${name}, your ${year} year-in-review PDF is ready in Clerkfolio under Import & export > Data backup.`,
          unsub ? `\nUnsubscribe from this email: ${unsub}` : '',
        ].join(''),
        html: `<p>Hi ${escapeHtml(name)},</p><p>Your ${year} year-in-review PDF is ready in Clerkfolio under <strong>Import &amp; export &gt; Data backup</strong>.</p>${unsub ? `<p style="font-size:12px;color:#666;"><a href="${escapeHtml(unsub)}">Unsubscribe from this email</a></p>` : ''}`,
        ...(unsub
          ? { headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }
          : {}),
      })
      if (result.ok) emailed += 1
      else logBackgroundJobError('cron.year-in-review.email', new Error(result.error), { userId: profile.id, code: result.code })
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
