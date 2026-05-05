import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCronSecret } from '@/lib/cron'
import { logBackgroundJobError } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const STORAGE_BUCKET = 'evidence'
const CHUNK = 500

async function purgeEvidenceForEntries(
  supabase: ReturnType<typeof createServiceClient>,
  entryIds: string[],
  entryType: 'portfolio' | 'case'
) {
  if (entryIds.length === 0) return

  // Fetch all evidence rows referencing the entries we're about to hard-delete.
  // We delete the storage objects first (best-effort) and then the DB rows.
  const { data: files, error } = await supabase
    .from('evidence_files')
    .select('id, file_path')
    .in('entry_id', entryIds)
    .eq('entry_type', entryType)

  if (error) {
    logBackgroundJobError('cron.purge_deleted.evidence_lookup', error, { entryType, count: entryIds.length })
    return
  }
  if (!files || files.length === 0) return

  const paths = files.map(f => f.file_path)
  for (let offset = 0; offset < paths.length; offset += CHUNK) {
    const slice = paths.slice(offset, offset + CHUNK)
    const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove(slice)
    if (storageError) {
      // Storage failures don't block DB cleanup — log and continue. Better to leave a few
      // orphan objects than to leave both DB rows and storage forever.
      logBackgroundJobError('cron.purge_deleted.storage_remove', storageError, { count: slice.length })
    }
  }

  const ids = files.map(f => f.id)
  for (let offset = 0; offset < ids.length; offset += CHUNK) {
    const slice = ids.slice(offset, offset + CHUNK)
    const { error: dbError } = await supabase.from('evidence_files').delete().in('id', slice)
    if (dbError) logBackgroundJobError('cron.purge_deleted.evidence_delete', dbError, { count: slice.length })
  }
}

export async function GET(request: NextRequest) {
  const cronError = validateCronSecret(request)
  if (cronError) return cronError

  const supabase = createServiceClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()

  // Identify the rows we're about to hard-delete so we can clean their evidence first.
  const [{ data: doomedCases, error: casesLookupError }, { data: doomedEntries, error: entriesLookupError }] = await Promise.all([
    supabase.from('cases').select('id').lt('deleted_at', thirtyDaysAgo).not('deleted_at', 'is', null),
    supabase.from('portfolio_entries').select('id').lt('deleted_at', thirtyDaysAgo).not('deleted_at', 'is', null),
  ])

  if (casesLookupError || entriesLookupError) {
    return NextResponse.json(
      { error: casesLookupError?.message ?? entriesLookupError?.message },
      { status: 500 }
    )
  }

  const caseIds = (doomedCases ?? []).map(r => r.id)
  const entryIds = (doomedEntries ?? []).map(r => r.id)

  await purgeEvidenceForEntries(supabase, caseIds, 'case')
  await purgeEvidenceForEntries(supabase, entryIds, 'portfolio')

  const [{ error: casesError }, { error: entriesError }] = await Promise.all([
    supabase.from('cases').delete().lt('deleted_at', thirtyDaysAgo).not('deleted_at', 'is', null),
    supabase.from('portfolio_entries').delete().lt('deleted_at', thirtyDaysAgo).not('deleted_at', 'is', null),
  ])

  if (casesError || entriesError) {
    return NextResponse.json({ error: casesError?.message ?? entriesError?.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    purged: { cases: caseIds.length, portfolio_entries: entryIds.length },
  })
}
