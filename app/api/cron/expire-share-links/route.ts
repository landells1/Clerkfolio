import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import * as Sentry from '@sentry/nextjs'
import { validateCronSecret } from '@/lib/cron'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const cronError = validateCronSecret(request)
  if (cronError) return cronError

  return Sentry.withMonitor('cron-expire-share-links', async () => {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('share_links')
    .update({ revoked_at: new Date().toISOString(), revoked: true })
    .lt('expires_at', new Date().toISOString())
    .is('revoked_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
  }, {
    schedule: { type: 'crontab', value: '0 1 * * *' },
    timezone: 'UTC',
    checkinMargin: 5,
    maxRuntime: 30,
    failureIssueThreshold: 1,
  })
}
