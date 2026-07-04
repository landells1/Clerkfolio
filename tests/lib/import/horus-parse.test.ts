import { describe, it, expect } from 'vitest'
import { parseDate, mapReflectionType } from '@/lib/import/horus-parse'

describe('Horus parseDate', () => {
  it('parses DD/MM/YYYY (UK order) without swapping day/month', () => {
    expect(parseDate('05/07/2025')).toBe('2025-07-05')
    expect(parseDate('5/7/2025')).toBe('2025-07-05')
    expect(parseDate('31/12/2026')).toBe('2026-12-31')
  })

  it('passes through YYYY-MM-DD unchanged', () => {
    expect(parseDate('2025-07-05')).toBe('2025-07-05')
  })

  it('reads free-text "D Month YYYY" via LOCAL getters (M-4: no UTC roll-back)', () => {
    // The bug this guards: reading the parsed date back with toISOString()
    // rolled "5 July 2025" to 2025-07-04 on any non-UTC runtime. The result
    // must be the same calendar day that was written, regardless of TZ.
    expect(parseDate('5 July 2025')).toBe('2025-07-05')
    expect(parseDate('1 January 2026')).toBe('2026-01-01')
  })

  it('returns null for empty or unparseable input', () => {
    expect(parseDate('')).toBeNull()
    expect(parseDate('not a date')).toBeNull()
  })
})

describe('Horus mapReflectionType', () => {
  it.each([
    ['CbD', 'cbd'],
    ['case-based discussion', 'cbd'],
    ['Mini-CEX', 'mini_cex'],
    ['minicex', 'mini_cex'],
    ['DOPS', 'dop'],
    ['directly observed procedure', 'dop'],
    ['Reflection', 'reflection'],
    ['ACAT', 'reflection'],
  ])('maps %s -> %s', (input, expected) => {
    expect(mapReflectionType(input)).toBe(expected)
  })

  it('returns null for an unrecognised type', () => {
    expect(mapReflectionType('something else')).toBeNull()
  })
})
