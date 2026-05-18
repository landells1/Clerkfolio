import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCronSecret } from '@/lib/cron'
import * as Sentry from '@sentry/nextjs'
import { logBackgroundJobError } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Deletes consumed or expired institutional-email verification tokens that are
// older than 30 days. Keeps recent rows so support can investigate "I clicked
// the link and it failed" tickets, but caps storage growth - the table never
// shrinks on its own.
export async function GET(request: NextRequest) {
  const cronError = validateCronSecret(request)
  if (cronError) return cronError

  return Sentry.withMonitor('cron-purge-stale-tokens', async () => {
    const supabase = createServiceClient()
    const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString()

    // Delete tokens that are either consumed-and-old OR expired-and-old.
    // Two separate deletes because consumed_at and expires_at are independent
    // and there's no single "is this token dead" column. `.select('id')`
    // returns the deleted rows so we can report how many were removed.
    const consumedRes = await supabase
      .from('student_email_verification_tokens')
      .delete()
      .lt('consumed_at', cutoff)
      .select('id')

    const expiredRes = await supabase
      .from('student_email_verification_tokens')
      .delete()
      .lt('expires_at', cutoff)
      .is('consumed_at', null)
      .select('id')

    if (consumedRes.error) logBackgroundJobError('cron.purge_stale_tokens.consumed', consumedRes.error)
    if (expiredRes.error) logBackgroundJobError('cron.purge_stale_tokens.expired', expiredRes.error)

    return NextResponse.json({
      ok: true,
      purged: {
        consumed: consumedRes.data?.length ?? 0,
        expired: expiredRes.data?.length ?? 0,
      },
    })
  }, {
    schedule: { type: 'crontab', value: '0 4 * * 0' },
    timezone: 'UTC',
    checkinMargin: 5,
    maxRuntime: 60,
    failureIssueThreshold: 1,
  })
}
