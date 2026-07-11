// Server-side reconciliation of a finalised evidence upload's REAL size against
// the per-file cap and the user's storage quota.
//
// /api/upload/authorize necessarily trusts the client-declared fileSize - the
// bytes have not been uploaded yet at that point - so a crafted client can
// declare 1 byte, PUT ~50 MB, and leave the quota meter reading near-zero
// (get_profile_entitlements sums evidence_files.file_size). Finalisation is the
// first moment the true object size is known, so it is the only place the stored
// size can be corrected and the caps re-checked. This helper is the shared
// decision used by /api/upload/verify (fallback) and must be mirrored in the
// scan-evidence edge function (primary in production).

export type FinalisedUploadRejection = 'file_too_large' | 'over_quota'

export type FinalisedUploadDecision =
  | { ok: true }
  | { ok: false; reason: FinalisedUploadRejection }

/**
 * Decide whether a finalised upload may stay, given the REAL object size.
 *
 * Mirrors the two size checks /api/upload/authorize already runs against the
 * declared size (per-file cap, then quota), but against the true size. The
 * per-file cap wins when both are busted so the more specific message surfaces.
 *
 * `usedBytes` MUST already include this file at its corrected size (the row's
 * file_size has been reconciled before the quota total is read), so the quota
 * test is `usedBytes > quotaBytes` - the same boundary as authorize's
 * `usedBytes + fileSize > quotaBytes` (exactly-at-quota is allowed).
 */
export function checkFinalisedUploadSize(params: {
  /** Real size of the stored object, in bytes. */
  actualBytes: number
  /** Per-file hard cap, in bytes. */
  maxFileBytes: number
  /** Total stored bytes for the user INCLUDING this file at its real size (base-ten). */
  usedBytes: number
  /** The user's storage quota, in bytes (base-ten). */
  quotaBytes: number
}): FinalisedUploadDecision {
  const { actualBytes, maxFileBytes, usedBytes, quotaBytes } = params
  if (actualBytes > maxFileBytes) return { ok: false, reason: 'file_too_large' }
  if (usedBytes > quotaBytes) return { ok: false, reason: 'over_quota' }
  return { ok: true }
}
