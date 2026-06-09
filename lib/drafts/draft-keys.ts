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

// Keys whose values are non-empty in a *pristine* (untouched) new-entry form and
// therefore must not, on their own, count as user content: the category selector,
// the selects that default to a real option (audit/conference type, reflection
// framework), the auto-filled date, and the draft's own expiry stamp. Without
// this, simply opening /portfolio/new autosaved a "draft" of those defaults,
// which then falsely raised the "Draft restored" banner on the next visit,
// made Discard take two clicks (the default-category draft was re-restored when
// the form reset its category), and surfaced a stale "Pick up where you left
// off" card. (BUG-005)
const PRISTINE_DRAFT_KEYS = new Set([
  '_expires',
  'category',
  'date',
  'auditType',
  'confType',
  'reflFramework',
])

/** True if a parsed portfolio autosave draft holds real user input rather than
 *  only the structural defaults an untouched form would autosave. */
export function portfolioDraftHasContent(draft: Record<string, unknown>): boolean {
  return Object.entries(draft).some(([key, value]) => {
    if (PRISTINE_DRAFT_KEYS.has(key)) return false
    if (typeof value === 'string') return value.trim().length > 0
    if (Array.isArray(value)) return value.length > 0
    return false
  })
}
