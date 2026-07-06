import type { SupabaseClient } from '@supabase/supabase-js'
import type { EvidenceEntryType } from '@/lib/evidence/links'

// Shared client-side evidence teardown for the trash "delete permanently" /
// "empty trash" flows. Evidence reuse means a physical file can be attached to
// several entries, so hard-deleting an entry must NOT blindly delete its files:
//   1. drop this entry's link rows,
//   2. delete the storage object + evidence_files row ONLY for files whose last
//      link is now gone (a file still linked to another entry survives).
// Runs under the user's RLS context (anon/SSR client) so it only ever touches
// the current user's own rows.

export type EvidencePurgeTarget = { entryId: string; entryType: EvidenceEntryType }

export type EvidencePurgeResult = { error: string | null }

export async function purgeEvidenceForEntriesClient(
  supabase: SupabaseClient,
  userId: string,
  targets: EvidencePurgeTarget[],
): Promise<EvidencePurgeResult> {
  if (targets.length === 0) return { error: null }

  const byType: Record<EvidenceEntryType, string[]> = { portfolio: [], case: [] }
  for (const t of targets) byType[t.entryType].push(t.entryId)

  // 1. Collect every file linked to any of the doomed entries.
  const candidateFileIds = new Set<string>()
  for (const entryType of ['portfolio', 'case'] as const) {
    const ids = byType[entryType]
    if (ids.length === 0) continue
    const { data: links, error } = await supabase
      .from('evidence_file_links')
      .select('file_id')
      .eq('entry_type', entryType)
      .in('entry_id', ids)
    if (error) return { error: 'Failed to prepare evidence for deletion' }
    for (const l of (links ?? []) as { file_id: string }[]) candidateFileIds.add(l.file_id)
  }

  // 2. Drop the doomed entries' link rows.
  for (const entryType of ['portfolio', 'case'] as const) {
    const ids = byType[entryType]
    if (ids.length === 0) continue
    const { error } = await supabase
      .from('evidence_file_links')
      .delete()
      .eq('entry_type', entryType)
      .in('entry_id', ids)
    if (error) return { error: 'Failed to prepare evidence for deletion' }
  }

  if (candidateFileIds.size === 0) return { error: null }
  const candidateIds = Array.from(candidateFileIds)

  // 3. Which candidate files still have links? Those survive.
  const { data: survivingLinks, error: survivingError } = await supabase
    .from('evidence_file_links')
    .select('file_id')
    .in('file_id', candidateIds)
  if (survivingError) return { error: 'Failed to prepare evidence for deletion' }
  const stillLinked = new Set((survivingLinks ?? []).map(l => l.file_id))
  const orphanFileIds = candidateIds.filter(id => !stillLinked.has(id))
  if (orphanFileIds.length === 0) return { error: null }

  // 4. Remove storage objects then evidence_files rows for the orphans.
  const { data: orphanFiles, error: lookupError } = await supabase
    .from('evidence_files')
    .select('id, file_path')
    .in('id', orphanFileIds)
    .eq('user_id', userId)
  if (lookupError) return { error: 'Failed to prepare evidence for deletion' }

  const paths = (orphanFiles ?? []).map(f => f.file_path).filter(Boolean)
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from('evidence').remove(paths)
    if (storageError) return { error: 'Failed to delete linked evidence files' }
  }

  const ids = (orphanFiles ?? []).map(f => f.id)
  if (ids.length > 0) {
    const { error: deleteError } = await supabase
      .from('evidence_files')
      .delete()
      .in('id', ids)
      .eq('user_id', userId)
    if (deleteError) return { error: 'Failed to delete evidence records' }
  }

  return { error: null }
}
