import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCronSecret } from '@/lib/cron'
import { currentLondonWeekWindow } from '@/lib/engagement/streaks'
import { fetchOwnerMetrics, buildOwnerMetricsEmail } from '@/lib/metrics/owner-metrics'
import { LEGAL_ENTITY } from '@/lib/legal/entity'
import * as Sentry from '@sentry/nextjs'
import { logBackgroundJobError } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Weekly OWNER-only analytics digest. NOT user-facing. Aggregate counts only -
// no user emails, names, or free-text content. Sent to the same owner mailbox
// the feedback route already uses (lib/legal/entity.ts LEGAL_ENTITY.contactEmail
// = admin@clerkfolio.co.uk), so there is one source for "where owner mail goes".
export async function GET(req: NextRequest) {
  const cronError = validateCronSecret(req)
  if (cronError) return cronError

  return Sentry.withMonitor('cron-owner-metrics', async () => {
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return NextResponse.json({ ok: true, sent: false, skipped: 'missing_resend_key' })

    const supabase = createServiceClient()
    const { start, end } = currentLondonWeekWindow()
    const windowLabel = `week of ${start.toISOString().split('T')[0]}`

    let snapshot
    try {
      snapshot = await fetchOwnerMetrics(supabase, { start, end, label: windowLabel })
    } catch (error) {
      // Never let an owner-analytics query failure crash the cron - log and
      // return, same posture as every other digest cron in this codebase.
      logBackgroundJobError('cron.owner-metrics.fetch', error)
      return NextResponse.json({ ok: false, sent: false, error: 'metrics_fetch_failed' }, { status: 500 })
    }

    const email = buildOwnerMetricsEmail(snapshot)
    const resend = new Resend(resendKey)
    try {
      await resend.emails.send({
        from: 'Clerkfolio <hello@clerkfolio.co.uk>',
        to: LEGAL_ENTITY.contactEmail,
        subject: email.subject,
        text: email.text,
        html: email.html,
      })
    } catch (error) {
      logBackgroundJobError('cron.owner-metrics.email', error)
      return NextResponse.json({ ok: false, sent: false, error: 'email_send_failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, sent: true })
  }, {
    schedule: { type: 'crontab', value: '0 8 * * 1' },
    timezone: 'UTC',
    checkinMargin: 5,
    maxRuntime: 60,
    failureIssueThreshold: 1,
  })
}
