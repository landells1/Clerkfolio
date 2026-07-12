/**
 * "Add to export" preselect handoff.
 *
 * The portfolio bulk-action bar's "Add to export" button
 * (`components/portfolio/portfolio-list-client.tsx`) writes the user's
 * curated selection of entry IDs to `sessionStorage` before navigating to
 * `/export`, so the export page can preselect exactly those entries on the
 * Application PDF tab instead of re-selecting everything. This is a
 * one-shot handoff: the export page reads the payload once on load and is
 * responsible for removing the key so a stale payload can never leak into
 * a later, unrelated visit to `/export`.
 *
 * `parseExportPreselect` is defensive by design: malformed JSON, a
 * non-array payload, non-string members, and IDs that don't match an
 * actually-loaded entry are all silently dropped rather than surfaced as
 * an error, so a corrupted or stale payload degrades to "no preselect"
 * (the normal select-all behaviour) rather than breaking the page.
 *
 * The export page consumes the key in two steps: its first load effect
 * PEEKS at the key (without removing it) to force the specialty filter to
 * "All records" - otherwise the default specialty would filter the loaded
 * entries BEFORE validation and silently drop out-of-specialty IDs - and
 * the entry-loading effect is the sole consumer that reads, validates,
 * and removes the key.
 */
export const EXPORT_PRESELECT_STORAGE_KEY = 'clerkfolio-export-preselect'

export function parseExportPreselect(raw: string | null | undefined, knownIds: ReadonlySet<string>): string[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  return parsed.filter((id): id is string => typeof id === 'string' && knownIds.has(id))
}
