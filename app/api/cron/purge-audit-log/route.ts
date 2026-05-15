import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import * as Sentry from '@sentry/nextjs'
import { validateCronSecret } from '@/lib/cron'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const cronError = validateCronSecret(request)
  if (cronError) return cronError

  return Sentry.withMonitor('cron-purge-audit-log', async () => {
  const supabase = createServiceClient()
  const oneYearAgo = new Date(Date.now() - 365 * 86_400_000).toISOString()
  const { error } = await supabase
    .from('audit_log')
    .delete()
    .lt('created_at', oneYearAgo)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
  }, {
    schedule: { type: 'crontab', value: '0 3 * * 0' },
    timezone: 'UTC',
    checkinMargin: 5,
    maxRuntime: 30,
    failureIssueThreshold: 1,
  })
}
