// Pure parsing helpers for the Horus import (/api/import/horus). Extracted from
// the route so the date/reflection-type parsing can be unit-tested directly
// (the date parser had the M-4 UTC round-trip bug).

export function parseDate(raw: string): string | null {
  if (!raw) return null
  // Try DD/MM/YYYY
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  // Try YYYY-MM-DD
  const iso = raw.match(/^\d{4}-\d{2}-\d{2}$/)
  if (iso) return raw
  // Try D Month YYYY. new Date(raw) parses free text in the server's LOCAL
  // timezone, so read the calendar date back with local getters - never via
  // toISOString(), whose UTC conversion rolls "5 July 2025" back to July 4th
  // whenever the runtime isn't TZ=UTC (self-hosting, local dev imports).
  const mdy = new Date(raw)
  if (!isNaN(mdy.getTime())) {
    return `${mdy.getFullYear()}-${String(mdy.getMonth() + 1).padStart(2, '0')}-${String(mdy.getDate()).padStart(2, '0')}`
  }
  return null
}

export function mapReflectionType(raw: string): 'cbd' | 'dop' | 'mini_cex' | 'reflection' | null {
  const value = raw.toLowerCase()
  if (value.includes('cbd') || value.includes('case-based')) return 'cbd'
  if (value.includes('mini-cex') || value.includes('minicex')) return 'mini_cex'
  if (value.includes('dop') || value.includes('directly observed')) return 'dop'
  if (value.includes('reflection') || value.includes('acat') || value.includes('acute care')) return 'reflection'
  return null
}
