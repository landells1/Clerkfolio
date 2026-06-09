import { describe, it, expect } from 'vitest'
import { validateEntryNumericFields } from '@/lib/utils/entry-numeric-validation'

describe('validateEntryNumericFields', () => {
  it('accepts empty optional fields', () => {
    expect(validateEntryNumericFields('procedure', '', '')).toBeNull()
    expect(validateEntryNumericFields('conference', '   ', '')).toBeNull()
  })

  it('only validates the field relevant to the category', () => {
    // A negative proc_count is irrelevant when the category is not "procedure".
    expect(validateEntryNumericFields('conference', '-5', '6')).toBeNull()
    // A bad cpd value is irrelevant when the category is not "conference".
    expect(validateEntryNumericFields('procedure', '3', '-1')).toBeNull()
  })

  describe('procedure count', () => {
    it('accepts a whole number within range', () => {
      expect(validateEntryNumericFields('procedure', '3', '')).toBeNull()
      expect(validateEntryNumericFields('procedure', '9999', '')).toBeNull()
    })

    it('rejects negatives, zero, decimals, non-numbers and out-of-range values', () => {
      for (const bad of ['-5', '0', '2.5', 'abc', '10000']) {
        expect(validateEntryNumericFields('procedure', bad, '')).toMatch(/Number performed/)
      }
    })
  })

  describe('conference CPD hours', () => {
    it('accepts decimals within range', () => {
      expect(validateEntryNumericFields('conference', '', '6')).toBeNull()
      expect(validateEntryNumericFields('conference', '', '0')).toBeNull()
      expect(validateEntryNumericFields('conference', '', '7.5')).toBeNull()
      expect(validateEntryNumericFields('conference', '', '999')).toBeNull()
    })

    it('rejects negatives, non-numbers and out-of-range values', () => {
      for (const bad of ['-1', 'abc', '1000']) {
        expect(validateEntryNumericFields('conference', '', bad)).toMatch(/CPD hours/)
      }
    })
  })
})
