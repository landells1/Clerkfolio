// List filters are NOT remembered between visits.
//
// The saved-search bar used to write the current filters to localStorage and
// silently re-apply them whenever the user opened the bare page. That turned
// the Portfolio nav link into a trap: a theme filter from last week came back
// on arrival, the header said "3 entries logged" while the body said "No
// entries match", and the only hint was a small "Filtered" chip (QA 2026-10).
// A bare URL is now always the unfiltered view; filters live only in the URL
// (and in explicitly saved searches). The old stored value is cleared on
// sight so it can never be restored by an older client either.
//
// `view` and `category` are *navigational* portfolio params (which tab /
// category you are looking at), not filters - they never count as "filtered".

export const NON_PERSISTED_PARAMS = ['view', 'category'] as const

/** localStorage key the retired persistence used, per pathname. */
export function legacyFilterStorageKey(pathname: string): string {
  return `clerkfolio-filters:${pathname}`
}

/** Drop navigational params, returning the remaining query string (stable order). */
export function stripNavParams(search: string): string {
  const params = new URLSearchParams(search)
  for (const key of NON_PERSISTED_PARAMS) params.delete(key)
  return params.toString()
}

/** True when the query string carries a real filter (not just navigation). */
export function hasActiveFilters(search: string): boolean {
  return stripNavParams(search).length > 0
}
