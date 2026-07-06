import type { SupabaseClient } from '@supabase/supabase-js'
import type { EvidenceFile } from '@/lib/supabase/storage'
import type { EvidenceEntryType } from '@/lib/evidence/links'

// Server-side evidence reads that resolve files THROUGH the evidence_file_links
// join table (evidence reuse). A file linked to an entry shows on that entry
// even if it was originally uploaded against a different one. Callers run under
// the user's RLS context (the anon/SSR client), so these only ever see the
// current user's own rows.

export type EvidenceFileWithLinks = EvidenceFile & {
  /** All entries this physical file is currently attached to. */
  links: { entry_id: string; entry_type: EvidenceEntryType }[]
}

/** An entry's evidence file plus how many entries the physical file is
 *  attached to (linkCount > 1 => reused across entries; drives the UI badge
 *  and the "this is the last copy" unlink copy). */
export type EvidenceFileForEntry = EvidenceFile & { linkCount: number }

/**
 * All evidence files attached to one entry via the join table, ordered by
 * upload time, each carrying its total link count. Replaces the old direct
 * `.eq('entry_id').eq('entry_type')` query so multi-linked files appear on
 * every entry they're linked to.
 */
export async function fetchEvidenceForEntry(
  supabase: SupabaseClient,
  entryId: string,
  entryType: EvidenceEntryType,
): Promise<EvidenceFileForEntry[]> {
  const { data: links, error: linkError } = await supabase
    .from('evidence_file_links')
    .select('file_id')
    .eq('entry_id', entryId)
    .eq('entry_type', entryType)

  if (linkError || !links || links.length === 0) return []

  const fileIds = links.map(l => l.file_id)
  const [{ data: files, error: fileError }, { data: allLinks }] = await Promise.all([
    supabase
      .from('evidence_files')
      .select('*')
      .in('id', fileIds)
      .order('created_at', { ascending: true }),
    // Total link count per file (RLS-scoped to the user's own files).
    supabase
      .from('evidence_file_links')
      .select('file_id')
      .in('file_id', fileIds),
  ])

  if (fileError || !files) return []

  const countByFile = new Map<string, number>()
  for (const l of (allLinks ?? []) as { file_id: string }[]) {
    countByFile.set(l.file_id, (countByFile.get(l.file_id) ?? 0) + 1)
  }

  return (files as EvidenceFile[]).map(file => ({
    ...file,
    linkCount: countByFile.get(file.id) ?? 1,
  }))
}

/**
 * The user's full evidence library for the "attach existing file" picker: every
 * clean physical file they own, each with the list of entries it is linked to
 * (so the UI can show "linked to N entries" and hide files already attached to
 * the current entry). One query per table + a client-side join; the row counts
 * here are bounded by a single user's quota.
 */
export async function fetchUserEvidenceLibrary(
  supabase: SupabaseClient,
  userId: string,
): Promise<EvidenceFileWithLinks[]> {
  const [{ data: files, error: filesError }, { data: allLinks, error: linksError }] = await Promise.all([
    supabase
      .from('evidence_files')
      .select('*')
      .eq('user_id', userId)
      .eq('scan_status', 'clean')
      .order('created_at', { ascending: false }),
    supabase
      .from('evidence_file_links')
      .select('file_id, entry_id, entry_type'),
  ])

  if (filesError || !files) return []

  const linksByFile = new Map<string, { entry_id: string; entry_type: EvidenceEntryType }[]>()
  if (!linksError && allLinks) {
    for (const link of allLinks as { file_id: string; entry_id: string; entry_type: EvidenceEntryType }[]) {
      const list = linksByFile.get(link.file_id) ?? []
      list.push({ entry_id: link.entry_id, entry_type: link.entry_type })
      linksByFile.set(link.file_id, list)
    }
  }

  return (files as EvidenceFile[]).map(file => ({
    ...file,
    links: linksByFile.get(file.id) ?? [],
  }))
}
