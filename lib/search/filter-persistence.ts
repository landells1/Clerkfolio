// Decides how the "remember my filters" persistence in SavedSearchBar should react
// to the current URL. Extracted as a pure function so the routing behaviour can be
// unit-tested without a router.
//
// `view` and `category` are *navigational* portfolio params (which tab / category
// you are looking at), not saved filters. Persisting them turned bare `/portfolio`
// and the "back to all"/"Categories"/"All" controls into a trap that bounced users
// straight back into the last-viewed category (BUG-008). They are therefore never
// stored or restored. Stripping them on restore as well neutralises any value left
// in localStorage by the previous, buggy version.

export const NON_PERSISTED_PARAMS = ['view', 'category'] as const

export type FilterPersistenceDecision =
  | { action: 'restore'; params: string }
  | { action: 'persist'; params: string }
  | { action: 'none' }

/** Drop navigational params, returning the remaining query string (stable order). */
export function stripNavParams(search: string): string {
  const params = new URLSearchParams(search)
  for (const key of NON_PERSISTED_PARAMS) params.delete(key)
  return params.toString()
}

/**
 * @param currentSearch the current `searchParams.toString()` (no leading `?`)
 * @param stored        the value previously written to localStorage, or null
 */
export function resolveFilterPersistence(
  currentSearch: string,
  stored: string | null,
): FilterPersistenceDecision {
  // A completely bare URL is the default landing / reset target: re-apply the last
  // remembered *filters* only (navigation is never restored), if any remain.
  if (!currentSearch) {
    const restorable = stripNavParams(stored ?? '')
    return restorable ? { action: 'restore', params: restorable } : { action: 'none' }
  }
  // Otherwise remember the current filters with navigation stripped out.
  return { action: 'persist', params: stripNavParams(currentSearch) }
}
