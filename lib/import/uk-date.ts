// Strict UK-order date parsing for imports (CSV, Horus). Returns an ISO
// calendar date ("YYYY-MM-DD") or null - never a guess. In particular it never
// falls back to `new Date(raw)`, which reads "05/10/2025" as US month-first
// (10 May) and, via toISOString(), rolls dates back a day under BST.

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
}

// Optional trailing time: " 09:00", " 9:00:15", "T09:00:00Z", " 09:00 AM".
const TIME_SUFFIX = String.raw`(?:[T\s]+\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?\s*(?:[ap]\.?m\.?)?\s*(?:Z|[+-]\d{2}:?\d{2})?)?`

function expandYear(raw: string): number {
  const year = Number(raw)
  return raw.length === 2 ? 2000 + year : year
}

function toIso(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null
  if (!Number.isInteger(month) || month < 1 || month > 12) return null
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function parseUkDate(raw: string | null | undefined): string | null {
  const value = (raw ?? '').trim()
  if (!value) return null

  // ISO: 2025-10-05, optionally with a time.
  const iso = value.match(new RegExp(String.raw`^(\d{4})-(\d{1,2})-(\d{1,2})${TIME_SUFFIX}$`, 'i'))
  if (iso) return toIso(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  // Numeric day-first: 05/10/2025, 5.10.25, 05-10-2025, optionally with a time.
  const dmy = value.match(new RegExp(String.raw`^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})${TIME_SUFFIX}$`, 'i'))
  if (dmy) return toIso(expandYear(dmy[3]), Number(dmy[2]), Number(dmy[1]))

  // Day then month name: 5 October 2025, 05-Oct-2025, 5 Oct 25, 5th October 2025.
  const dMonY = value.match(new RegExp(String.raw`^(\d{1,2})(?:st|nd|rd|th)?[\s\-/]+([a-z]+)\.?,?[\s\-/]+(\d{2}|\d{4})${TIME_SUFFIX}$`, 'i'))
  if (dMonY) {
    const month = MONTHS[dMonY[2].toLowerCase()]
    return month ? toIso(expandYear(dMonY[3]), month, Number(dMonY[1])) : null
  }

  // Month name first: October 5, 2025 / Oct 5 2025 (unambiguous, so accepted).
  const monDY = value.match(new RegExp(String.raw`^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})${TIME_SUFFIX}$`, 'i'))
  if (monDY) {
    const month = MONTHS[monDY[1].toLowerCase()]
    return month ? toIso(Number(monDY[3]), month, Number(monDY[2])) : null
  }

  return null
}
