// Entry status taxonomy for cases and portfolio entries.
// Per product decision (2026-05-10): "verified" implies external sign-off which we do not do
// (out of scope per HANDOVER §1). The pill set is intentionally minimal:
//   draft     - work in progress; saved but not finalised
//   complete  - the user marks an entry as finished and ready
//   overdue   - a tracked deadline on this entry has passed (system-derived)
// "submitted" was dropped: there is no outbound submission flow.
// A future "shared" / "used as example" tag may be added but is out of scope here.

import type { PillColour } from '@/lib/specialties/colours'

export type EntryStatus = 'draft' | 'complete' | 'overdue'

export const STATUS_LABEL: Record<EntryStatus, string> = {
  draft: 'Draft',
  complete: 'Complete',
  overdue: 'Overdue',
}

export const STATUS_COLOUR: Record<EntryStatus, PillColour> = {
  draft: 'neutral',
  complete: 'green',
  overdue: 'rose',
}

// Returns true if the status' dot should pulse (overdue only).
export function statusPulses(status: EntryStatus): boolean {
  return status === 'overdue'
}
