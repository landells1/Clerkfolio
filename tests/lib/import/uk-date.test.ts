import { describe, it, expect } from 'vitest'
import { parseUkDate } from '@/lib/import/uk-date'

describe('parseUkDate', () => {
  it('reads numeric dates day-first with any common separator', () => {
    expect(parseUkDate('05/10/2025')).toBe('2025-10-05')
    expect(parseUkDate('5/10/2025')).toBe('2025-10-05')
    expect(parseUkDate('05-10-2025')).toBe('2025-10-05')
    expect(parseUkDate('05.10.2025')).toBe('2025-10-05')
    expect(parseUkDate('5/10/25')).toBe('2025-10-05')
  })

  it('ignores a trailing time instead of switching to US order', () => {
    expect(parseUkDate('05/10/2025 09:00')).toBe('2025-10-05')
    expect(parseUkDate('05/10/2025 09:00:30')).toBe('2025-10-05')
    expect(parseUkDate('2025-10-05T23:30:00Z')).toBe('2025-10-05')
    expect(parseUkDate('2025-10-05 00:15')).toBe('2025-10-05')
  })

  it('reads month names without a BST roll-back', () => {
    expect(parseUkDate('5 October 2025')).toBe('2025-10-05')
    expect(parseUkDate('05-Oct-2025')).toBe('2025-10-05')
    expect(parseUkDate('5th Oct 25')).toBe('2025-10-05')
    expect(parseUkDate('October 5, 2025')).toBe('2025-10-05')
    expect(parseUkDate('1 January 2026')).toBe('2026-01-01')
  })

  it('rejects impossible or ambiguous input rather than guessing', () => {
    expect(parseUkDate('31/02/2026')).toBeNull()
    expect(parseUkDate('2026-13-01')).toBeNull()
    expect(parseUkDate('not a date')).toBeNull()
    expect(parseUkDate('')).toBeNull()
    expect(parseUkDate(undefined)).toBeNull()
    expect(parseUkDate('5 Foo 2025')).toBeNull()
  })

  it('accepts leap days only in leap years', () => {
    expect(parseUkDate('29/02/2028')).toBe('2028-02-29')
    expect(parseUkDate('29/02/2027')).toBeNull()
  })
})
