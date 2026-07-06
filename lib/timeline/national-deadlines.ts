// Visibility rule for the pinned national NHS recruitment deadlines
// (NHS_ROUND_3_2026_DEADLINES) on the Timeline page and in the ICS feed.
//
// The user preference lives in `profiles.display_prefs.show_national_deadlines`
// (same JSON bag as theme/accessibility - no migration). Semantics:
//   - true / false: the user has explicitly ticked/unticked the Timeline
//     checkbox; honour it unconditionally.
//   - undefined (never touched): legacy behaviour - show the national dates
//     unless the user already has specialty-specific deadlines of their own,
//     in which case the generic national round is noise.
//
// Both the Timeline page and /api/calendar/feed must call this same helper so
// the calendar a user subscribes to never disagrees with the page.
export function shouldShowNationalDeadlines(
  pref: boolean | undefined,
  hasSpecialtySpecificDeadlines: boolean
): boolean {
  if (typeof pref === 'boolean') return pref
  return !hasSpecialtySpecificDeadlines
}

/** Extract the tri-state preference from a raw display_prefs JSON value. */
export function nationalDeadlinesPref(displayPrefs: unknown): boolean | undefined {
  if (!displayPrefs || typeof displayPrefs !== 'object' || Array.isArray(displayPrefs)) return undefined
  const value = (displayPrefs as Record<string, unknown>).show_national_deadlines
  return typeof value === 'boolean' ? value : undefined
}
