import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCronSecret } from '@/lib/cron'
import * as Sentry from '@sentry/nextjs'
import { logBackgroundJobError } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BUCKET = 'evidence'
const CHUNK = 500
// A pending/scanning evidence row older than 24h means the upload flow never
// finalised. Either the browser crashed
// between the two steps, or the user closed the tab, or the storage upload
// failed silently. Either way the row + any half-uploaded object should be
// cleaned up - otherwise the user's quota accumulates orphan bytes and the
// "Free / Pro" entitlement calculations diverge from reality.
const ORPHAN_HOURS = 24

export async function GET(request: NextRequest) {
  const cronError = validateCronSecret(request)
  if (cronError) return cronError

  return Sentry.withMonitor('cron-purge-orphan-uploads', async () => {
    const supabase = createServiceClient()
    const cutoff = new Date(Date.now() - ORPHAN_HOURS * 60 * 60 * 1000).toISOString()

    const { data: orphans, error: lookupError } = await supabase
      .from('evidence_files')
      .select('id, file_path')
      .in('scan_status', ['pending', 'scanning'])
      .lt('created_at', cutoff)

    if (lookupError) {
      logBackgroundJobError('cron.purge_orphan_uploads.lookup', lookupError)
      return NextResponse.json({ error: 'Failed to purge orphaned uploads.' }, { status: 500 })
    }
    if (!orphans || orphans.length === 0) {
      return NextResponse.json({ ok: true, purged: 0 })
    }

    const paths = orphans.map(o => o.file_path).filter((p): p is string => typeof p === 'string' && p.length > 0)
    for (let offset = 0; offset < paths.length; offset += CHUNK) {
      const slice = paths.slice(offset, offset + CHUNK)
      const { error: storageError } = await supabase.storage.from(BUCKET).remove(slice)
      // Storage may legitimately not have the object (authorize created the
      // row but the browser never uploaded). Log and continue - we still want
      // to delete the DB row.
      if (storageError) {
        logBackgroundJobError('cron.purge_orphan_uploads.storage_remove', storageError, { count: slice.length })
      }
    }

    const ids = orphans.map(o => o.id)
    for (let offset = 0; offset < ids.length; offset += CHUNK) {
      const slice = ids.slice(offset, offset + CHUNK)
      const { error: dbError } = await supabase.from('evidence_files').delete().in('id', slice)
      if (dbError) {
        logBackgroundJobError('cron.purge_orphan_uploads.db_delete', dbError, { count: slice.length })
      }
    }

    return NextResponse.json({ ok: true, purged: orphans.length })
  }, {
    schedule: { type: 'crontab', value: '15 3 * * *' },
    timezone: 'UTC',
    checkinMargin: 5,
    maxRuntime: 60,
    failureIssueThreshold: 1,
  })
}
