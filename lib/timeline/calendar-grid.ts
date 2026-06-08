// Calendar month-grid date helpers.
//
// BUG-004 / BUG-010: the timeline month grid previously compared each cell's
// date using `Date.toISOString()` (which is UTC) against deadline `YYYY-MM-DD`
// strings, while the cells themselves are built from LOCAL date components. In
// any timezone east of UTC (e.g. Europe/London in BST, UTC+1) a local-midnight
// cell serialises to the *previous* calendar day in UTC, so a deadline landed
// one cell late, and the SSR (UTC server) and CSR (user-timezone client)
// computed different cell contents, throwing React hydration error #418.
//
// Formatting from local components keeps the value identical on server and
// client and matches how the grid cells are constructed.

/** Format a Date as `YYYY-MM-DD` using its LOCAL calendar components. */
export function localIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Build the 42-cell (6 weeks) Monday-first month grid for the given month.
 *  Returns local-time Date objects; pair with {@link localIsoDate} so day
 *  matching stays timezone-stable. */
export function monthGridDays(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(first)
  // Shift back to the Monday on/just before the 1st (getDay(): 0=Sun..6=Sat).
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7))
  return Array.from({ length: 42 }, (_, index) => {
    const d = new Date(start)
    d.setDate(start.getDate() + index)
    return d
  })
}
