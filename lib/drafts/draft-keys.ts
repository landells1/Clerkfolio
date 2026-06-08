// Autosave draft key helpers.
//
// BUG-005: the new-entry form autosaves a draft per portfolio category under
// `clerkfolio-<category>-draft:<userId>` in sessionStorage. Saving only cleared
// the *current* category's key, so fragments written under other category keys
// (e.g. text typed before switching category) lingered and were re-restored on
// the next visit, repopulating the form ("Draft restored") and surfacing as a
// stale "Pick up where you left off" card — a duplicate-entry foot-gun. The
// /portfolio/new form only ever edits one entry at a time, so once an entry is
// saved every portfolio draft fragment for that user is stale.

const CASE_DRAFT_PREFIX = 'clerkfolio-case-draft:'
const DRAFT_KEY_PATTERN = /^clerkfolio-.*-draft:.+$/

/** True for a portfolio-category autosave draft key belonging to `userId`.
 *  Excludes the separate case-draft key. */
export function isPortfolioDraftKey(key: string, userId: string): boolean {
  return (
    key.endsWith(`:${userId}`) &&
    DRAFT_KEY_PATTERN.test(key) &&
    !key.startsWith(CASE_DRAFT_PREFIX)
  )
}

/** Filter a list of storage keys down to this user's portfolio draft keys. */
export function portfolioDraftKeysFor(allKeys: string[], userId: string): string[] {
  return allKeys.filter(key => isPortfolioDraftKey(key, userId))
}
