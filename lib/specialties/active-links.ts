import type { createClient } from '@/lib/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

type EntryLink = {
  entry_id: string | null
  entry_type: string | null
}

// Resolve the subset of `ids` that are still live (not soft-deleted) rows in
// `table`. Returns null on a query error so the caller can fail safe (treat
// nothing as live -> drop those entry-bound links rather than risk surfacing a
// deleted entry).
async function fetchLiveIds(
  supabase: SupabaseClient,
  table: 'portfolio_entries' | 'cases',
  ids: string[]
): Promise<Set<string> | null> {
  if (ids.length === 0) return new Set<string>()
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .in('id', ids)
    .is('deleted_at', null)
  if (error) return null
  return new Set((data ?? []).map(row => row.id))
}

/**
 * Filter a set of polymorphic entry links down to those whose target is still
 * live. Portfolio links are checked against portfolio_entries, case links
 * against cases; both drop when the target row is soft-deleted (deleted_at) or
 * gone. Links with a null entry_id (self-assessed / checkbox specialty claims)
 * always pass through unchanged.
 *
 * Callers that have already loaded the user's live entry ids can pass them to
 * skip the lookup query (dashboard hot-path optimisation, F-031). The portfolio
 * and case optimisations are independent — pass whichever you have; the other
 * side falls back to a lookup only when links of that type actually exist.
 */
export async function filterLinksToActiveEntries<T extends EntryLink>(
  supabase: SupabaseClient,
  links: T[],
  knownActiveEntryIds?: Set<string>,
  knownActiveCaseIds?: Set<string>
): Promise<T[]> {
  const portfolioIds = Array.from(new Set(
    links
      .filter(link => link.entry_type === 'portfolio' && link.entry_id)
      .map(link => link.entry_id as string)
  ))
  const caseIds = Array.from(new Set(
    links
      .filter(link => link.entry_type === 'case' && link.entry_id)
      .map(link => link.entry_id as string)
  ))

  // Resolve each type's live set. On a lookup error, treat that type as having
  // no live entries so its entry-bound links are dropped (fail safe); null-entry
  // links are unaffected either way.
  const activePortfolioIds = knownActiveEntryIds
    ?? (await fetchLiveIds(supabase, 'portfolio_entries', portfolioIds))
    ?? new Set<string>()
  const activeCaseIds = knownActiveCaseIds
    ?? (await fetchLiveIds(supabase, 'cases', caseIds))
    ?? new Set<string>()

  return links.filter(link => {
    if (link.entry_id == null) return true
    if (link.entry_type === 'portfolio') return activePortfolioIds.has(link.entry_id)
    if (link.entry_type === 'case') return activeCaseIds.has(link.entry_id)
    return false
  })
}
