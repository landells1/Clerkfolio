import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCronSecret } from '@/lib/cron'
import * as Sentry from '@sentry/nextjs'
import { logBackgroundJobError } from '@/lib/monitoring'
import { fetchAllRows } from '@/lib/supabase/fetch-all'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const STORAGE_BUCKET = 'evidence'
// Entry ids per batch: keeps each .in() filter well inside URL limits.
const ID_BATCH = 100

// Returns false when evidence cleanup could not be completed, so the caller
// keeps those entries (and retries tomorrow) instead of hard-deleting them and
// stranding evidence rows/objects that still count against the user's quota.
async function purgeEvidenceForEntries(
  supabase: ReturnType<typeof createServiceClient>,
  entryIds: string[],
  entryType: 'portfolio' | 'case'
): Promise<boolean> {
  if (entryIds.length === 0) return true

  // Evidence reuse: a physical file can be linked to several entries. Deleting
  // the doomed entries must (1) drop their link rows and (2) remove the storage
  // object + evidence_files row ONLY for files whose LAST link is now gone. A
  // file still linked to a surviving (or not-yet-purged) entry must be kept.

  // Files touched by any of the doomed entries (paged past the 1000-row cap).
  const { data: doomedLinks, error: doomedError } = await fetchAllRows<{ file_id: string }>((from, to) => supabase
    .from('evidence_file_links')
    .select('file_id')
    .in('entry_id', entryIds)
    .eq('entry_type', entryType)
    .order('id')
    .range(from, to))

  if (doomedError) {
    logBackgroundJobError('cron.purge_deleted.evidence_link_lookup', doomedError, { entryType, count: entryIds.length })
    return false
  }
  const candidateFileIds = Array.from(new Set((doomedLinks ?? []).map(l => l.file_id)))

  // Remove the doomed entries' link rows first so the "remaining links" count
  // below reflects reality.
  const { error: unlinkError } = await supabase
    .from('evidence_file_links')
    .delete()
    .in('entry_id', entryIds)
    .eq('entry_type', entryType)
  if (unlinkError) {
    logBackgroundJobError('cron.purge_deleted.evidence_unlink', unlinkError, { count: entryIds.length })
    return false
  }

  if (candidateFileIds.length === 0) return true

  // Of the touched files, which now have zero remaining links?
  const { data: survivingLinks, error: survivingError } = await fetchAllRows<{ file_id: string }>((from, to) => supabase
    .from('evidence_file_links')
    .select('file_id')
    .in('file_id', candidateFileIds)
    .order('id')
    .range(from, to))
  if (survivingError) {
    logBackgroundJobError('cron.purge_deleted.evidence_surviving_lookup', survivingError, { count: candidateFileIds.length })
    return false
  }
  const stillLinked = new Set((survivingLinks ?? []).map(l => l.file_id))
  const orphanFileIds = candidateFileIds.filter(id => !stillLinked.has(id))
  if (orphanFileIds.length === 0) return true

  // Look up paths for the now-orphaned files, then delete storage + rows.
  const { data: files, error } = await supabase
    .from('evidence_files')
    .select('id, file_path')
    .in('id', orphanFileIds)

  if (error) {
    logBackgroundJobError('cron.purge_deleted.evidence_lookup', error, { entryType, count: orphanFileIds.length })
    return false
  }
  if (!files || files.length === 0) return true

  const paths = files.map(f => f.file_path)
  const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove(paths)
  if (storageError) {
    // Storage failures don't block DB cleanup - log and continue. Better to leave a few
    // orphan objects than to leave both DB rows and storage forever.
    logBackgroundJobError('cron.purge_deleted.storage_remove', storageError, { count: paths.length })
  }

  const { error: dbError } = await supabase.from('evidence_files').delete().in('id', files.map(f => f.id))
  if (dbError) {
    logBackgroundJobError('cron.purge_deleted.evidence_delete', dbError, { count: files.length })
    return false
  }
  return true
}

// Purge one table's expired soft-deleted rows in id batches: evidence first,
// then delete EXACTLY the ids whose evidence cleanup succeeded (never an
// unbounded "everything past 30 days" delete that could outrun the cleanup).
async function purgeExpiredRows(
  supabase: ReturnType<typeof createServiceClient>,
  table: 'portfolio_entries' | 'cases',
  entryType: 'portfolio' | 'case',
  cutoff: string,
): Promise<{ purged: number; ok: boolean }> {
  const { data: doomed, error: lookupError } = await fetchAllRows<{ id: string }>((from, to) => supabase
    .from(table)
    .select('id')
    .lt('deleted_at', cutoff)
    .not('deleted_at', 'is', null)
    .order('id')
    .range(from, to))
  if (lookupError) {
    logBackgroundJobError(`cron.purge_deleted.${table}_lookup`, lookupError)
    return { purged: 0, ok: false }
  }

  let purged = 0
  let ok = true
  const ids = (doomed ?? []).map(row => row.id)
  for (let offset = 0; offset < ids.length; offset += ID_BATCH) {
    const batch = ids.slice(offset, offset + ID_BATCH)
    if (!(await purgeEvidenceForEntries(supabase, batch, entryType))) { ok = false; continue }
    const { error } = await supabase.from(table).delete().in('id', batch).not('deleted_at', 'is', null)
    if (error) {
      logBackgroundJobError(`cron.purge_deleted.${table}_delete`, error, { count: batch.length })
      ok = false
      continue
    }
    purged += batch.length
  }
  return { purged, ok }
}

export async function GET(request: NextRequest) {
  const cronError = validateCronSecret(request)
  if (cronError) return cronError

  return Sentry.withMonitor('cron-purge-deleted', async () => {
  const supabase = createServiceClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const [cases, entries] = await Promise.all([
    purgeExpiredRows(supabase, 'cases', 'case', thirtyDaysAgo),
    purgeExpiredRows(supabase, 'portfolio_entries', 'portfolio', thirtyDaysAgo),
  ])

  // Personal log rows (training, exams, rotations...) are soft-deleted to
  // Trash too; they carry no evidence, so a bounded delete is enough.
  const { data: purgedLogs, error: logsError } = await supabase
    .from('personal_log')
    .delete()
    .lt('deleted_at', thirtyDaysAgo)
    .not('deleted_at', 'is', null)
    .select('id')
  if (logsError) logBackgroundJobError('cron.purge_deleted.personal_log_delete', logsError)

  if (!cases.ok || !entries.ok || logsError) {
    return NextResponse.json({ error: 'Some deleted records could not be purged; they will be retried.' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    purged: { cases: cases.purged, portfolio_entries: entries.purged, personal_log: purgedLogs?.length ?? 0 },
  })
  }, {
    schedule: { type: 'crontab', value: '0 2 * * *' },
    timezone: 'UTC',
    checkinMargin: 5,
    maxRuntime: 60,
    failureIssueThreshold: 1,
  })
}
