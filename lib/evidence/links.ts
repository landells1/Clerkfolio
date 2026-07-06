// Pure decision logic for evidence-file reuse (see the evidence_file_links
// migration + /api/evidence/link + /api/evidence/unlink). Kept side-effect-free
// and DB-free so it can be unit-tested without a live database.
//
// The single hard rule these helpers encode:
//   * A physical evidence file (one evidence_files row = one storage object) is
//     removed only when its LAST link is gone. Unlinking from one entry is NOT
//     the same as deleting the file — it just detaches that one attachment.
//   * Storage quota counts each physical file once (by evidence_files.file_size)
//     regardless of how many entries it is linked to; adding a link never
//     changes usage, so linking is not quota-gated.

export type EvidenceEntryType = 'portfolio' | 'case'

/** A link row shape (subset) used by the decision helpers. */
export type EvidenceLinkRef = {
  entry_id: string
  entry_type: EvidenceEntryType
}

/**
 * Decide whether removing the link `(entryId, entryType)` should also delete
 * the underlying physical file, given the file's CURRENT full set of links.
 *
 * Returns `deleteFile: true` only when the link being removed is the file's
 * last remaining link — i.e. after removing it, no other entry still references
 * the file. Any other case is a plain unlink (the storage object stays because
 * another live entry still uses it).
 */
export function decideUnlink(
  currentLinks: EvidenceLinkRef[],
  entryId: string,
  entryType: EvidenceEntryType,
): { linkExists: boolean; deleteFile: boolean; remainingLinkCount: number } {
  const remaining = currentLinks.filter(
    l => !(l.entry_id === entryId && l.entry_type === entryType),
  )
  const linkExists = remaining.length < currentLinks.length
  return {
    linkExists,
    // Only delete the physical file if the link existed AND nothing else links it.
    deleteFile: linkExists && remaining.length === 0,
    remainingLinkCount: remaining.length,
  }
}

/**
 * Given the full set of links (across all of a user's files) that reference a
 * set of entries about to be hard-deleted, and a lookup of every link per file,
 * decide which files are now fully orphaned (zero links remain once the doomed
 * entries' links are gone) and can have their storage object + row removed.
 *
 * `linksByFile` must be the COMPLETE current link set for each candidate file
 * (not just the links to the doomed entries), so a file still attached to a
 * surviving entry is correctly kept.
 */
export function filesToDeleteAfterEntriesRemoved(
  linksByFile: Map<string, EvidenceLinkRef[]>,
  doomedEntries: EvidenceLinkRef[],
): { orphanedFileIds: string[]; keptFileIds: string[] } {
  const doomed = new Set(doomedEntries.map(e => `${e.entry_type}:${e.entry_id}`))
  const orphanedFileIds: string[] = []
  const keptFileIds: string[] = []
  for (const [fileId, links] of linksByFile) {
    const survivingLinks = links.filter(l => !doomed.has(`${l.entry_type}:${l.entry_id}`))
    if (survivingLinks.length === 0) orphanedFileIds.push(fileId)
    else keptFileIds.push(fileId)
  }
  return { orphanedFileIds, keptFileIds }
}

/**
 * Physical storage usage is the sum of DISTINCT physical file sizes — a file
 * linked to N entries is counted ONCE. Mirrors the get_profile_entitlements
 * SQL (sum(file_size) over evidence_files, not over links). Used in tests to
 * lock the "counted once" invariant.
 */
export function distinctStorageBytes(
  files: { id: string; file_size: number }[],
): number {
  const seen = new Set<string>()
  let total = 0
  for (const f of files) {
    if (seen.has(f.id)) continue
    seen.add(f.id)
    total += f.file_size
  }
  return total
}
