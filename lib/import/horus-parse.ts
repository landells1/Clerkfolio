// Pure parsing helpers for the Horus import (/api/import/horus). Extracted from
// the route so the date/reflection-type parsing can be unit-tested directly
// (the date parser had the M-4 UTC round-trip bug).

import { parseUkDate } from '@/lib/import/uk-date'

// Horus exports use UK day-first dates, sometimes with a time. Delegates to the
// shared strict parser (no US month-first fallback, no UTC round-trip).
export function parseDate(raw: string): string | null {
  return parseUkDate(raw)
}

export function mapReflectionType(raw: string): 'cbd' | 'dop' | 'mini_cex' | 'reflection' | null {
  const value = raw.toLowerCase()
  if (value.includes('cbd') || value.includes('case-based')) return 'cbd'
  if (value.includes('mini-cex') || value.includes('minicex')) return 'mini_cex'
  if (value.includes('dop') || value.includes('directly observed')) return 'dop'
  if (value.includes('reflection') || value.includes('acat') || value.includes('acute care')) return 'reflection'
  return null
}
