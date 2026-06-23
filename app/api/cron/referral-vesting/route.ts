import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import * as Sentry from '@sentry/nextjs'
import { validateCronSecret } from '@/lib/cron'
import { vestDueReferrals } from '@/lib/referrals/rewards'

export const dynamic = 'force-dynamic'

// Daily referral vesting (Batch 1, F-002/F-036). Activates eligible pending
// referrals and vests activated ones past the vesting window, granting the
// referrer's milestone Pro + badges and firing the reward notifications/email.
export async function GET(request: NextRequest) {
  const cronError = validateCronSecret(request)
  if (cronError) return cronError

  return Sentry.withMonitor('cron-referral-vesting', async () => {
    const service = createServiceClient()
    const summary = await vestDueReferrals(service)
    return NextResponse.json({ ok: true, ...summary })
  }, {
    schedule: { type: 'crontab', value: '0 8 * * *' },
    timezone: 'UTC',
    checkinMargin: 5,
    maxRuntime: 60,
    failureIssueThreshold: 1,
  })
}
