// Staged evidence changes for the entry / case EDIT forms.
//
// "Attach an existing file", "Unlink from this entry" and "Delete file
// everywhere" used to take effect the moment they were clicked, so pressing
// Cancel afterwards did not undo them. They are now staged in the form and
// applied only by "Save changes" (Cancel discards them). This module is the
// pure planning half; the form calls the existing owner-checked endpoints.

export type RemovalMode = 'unlink' | 'delete'

export type EvidenceOperation =
  | { op: 'delete'; fileId: string }
  | { op: 'unlink'; fileId: string }
  | { op: 'attach'; fileId: string }

/**
 * Ordered operations for a save: whole-file deletes first, then unlinks, then
 * new attachments. An attachment staged for a file that is also being
 * deleted is dropped (there would be nothing left to attach).
 */
export function planEvidenceOperations(attachIds: string[], removals: Record<string, RemovalMode>): EvidenceOperation[] {
  const deletes = Object.entries(removals).filter(([, mode]) => mode === 'delete').map(([fileId]) => fileId)
  const unlinks = Object.entries(removals).filter(([, mode]) => mode === 'unlink').map(([fileId]) => fileId)
  const deleted = new Set(deletes)
  const attaches = Array.from(new Set(attachIds)).filter(fileId => !deleted.has(fileId))
  return [
    ...deletes.map(fileId => ({ op: 'delete' as const, fileId })),
    ...unlinks.map(fileId => ({ op: 'unlink' as const, fileId })),
    ...attaches.map(fileId => ({ op: 'attach' as const, fileId })),
  ]
}

/** Stable signature of the staged changes, for the unsaved-changes check. */
export function stagedEvidenceSignature(attachIds: string[], removals: Record<string, RemovalMode>): string {
  const removalPart = Object.entries(removals).sort(([a], [b]) => a.localeCompare(b)).map(([id, mode]) => `${mode}:${id}`)
  return [...[...attachIds].sort().map(id => `attach:${id}`), ...removalPart].join('|')
}
