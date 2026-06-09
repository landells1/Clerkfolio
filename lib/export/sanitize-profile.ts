/**
 * GDPR / account-export profile sanitisation.
 *
 * The account export (`POST /api/account/export`) fetches the profile with
 * `select('*')` to keep the data-subject backup complete. Some profile columns
 * are server-side secret-derived values that must never leave the server, the
 * same way the export already excludes `api_keys.hash`, `session_fingerprints`
 * /`share_access_attempts` `ip_hash`, and `share_links.pin_hash`/`token`.
 *
 * - `calendar_feed_token`      — plaintext ICS feed token. Stored NULL under the
 *   hash-only model, but stripped defensively in case a plaintext is ever held.
 * - `calendar_feed_token_hash` — SHA-256 of the ICS feed token. Not reversible,
 *   but a hash an attacker could validate a guess against; no reason to ship it
 *   in a backup. (BUG-012)
 *
 * Note: this is a *denylist*, not an allowlist, so genuinely new profile fields
 * stay in the export (GDPR Art. 20 completeness) without code changes.
 */
export const PROFILE_EXPORT_SECRET_COLUMNS = [
  'calendar_feed_token',
  'calendar_feed_token_hash',
] as const

export function sanitizeProfileForExport(profile: unknown): Record<string, unknown> {
  if (!profile || typeof profile !== 'object') return {}
  const safe: Record<string, unknown> = { ...(profile as Record<string, unknown>) }
  for (const column of PROFILE_EXPORT_SECRET_COLUMNS) {
    delete safe[column]
  }
  return safe
}
