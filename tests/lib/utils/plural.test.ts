// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { countLabel, ordinal, pluralize, sentenceCase } from '@/lib/utils/plural'

describe('pluralize / countLabel', () => {
  it('uses the singular only for exactly one', () => {
    expect(countLabel(1, 'entry', 'entries')).toBe('1 entry')
    expect(countLabel(0, 'entry', 'entries')).toBe('0 entries')
    expect(countLabel(2, 'case')).toBe('2 cases')
    expect(pluralize(1, 'deadline')).toBe('deadline')
  })
})

describe('ordinal', () => {
  it('handles the teens and the 1/2/3 endings', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '101st'])
  })
})

describe('sentenceCase', () => {
  it('capitalises only the first letter', () => {
    expect(sentenceCase('wba entries')).toBe('Wba entries')
    expect(sentenceCase('')).toBe('')
  })
})
