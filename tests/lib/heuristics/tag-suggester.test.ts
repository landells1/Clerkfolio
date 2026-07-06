// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { suggestTagsForText, KEYWORD_TAG_MAP } from '@/lib/heuristics/tag-suggester'

describe('suggestTagsForText — matching', () => {
  it('matches a single keyword to its tag', () => {
    expect(suggestTagsForText('Patient presented with chest pain and was worked up for MI.')).toContain('Cardiology')
  })

  it('matches multiple distinct domains in one text, up to 3 tags', () => {
    const text = 'Chest pain (cardiac) with breathless respiratory symptoms and a headache (neuro).'
    const tags = suggestTagsForText(text)
    expect(tags).toContain('Cardiology')
    expect(tags).toContain('Respiratory Medicine')
    expect(tags).toContain('Neurology')
    expect(tags.length).toBeLessThanOrEqual(3)
  })

  it('caps suggestions at 3 even when many domains match', () => {
    const text = 'cardiac resp neuro gastro surg paeds psych ortho derm renal diabet haem itu a&e'
    const tags = suggestTagsForText(text)
    expect(tags.length).toBe(3)
  })

  it('matches a keyword regardless of surrounding punctuation/word position', () => {
    expect(suggestTagsForText('Fracture of the femur, ortho referral made.')).toContain('Orthopaedics')
  })
})

describe('suggestTagsForText — case-insensitivity', () => {
  it('matches uppercase keyword text', () => {
    expect(suggestTagsForText('STEMI ON ECG, TAKEN TO CATH LAB')).toContain('Cardiology')
  })

  it('matches mixed-case keyword text', () => {
    expect(suggestTagsForText('Query DKA, blood glucose very high')).toContain('Endocrinology & Diabetes')
  })
})

describe('suggestTagsForText — no match', () => {
  it('returns an empty array for text with no keyword hits', () => {
    expect(suggestTagsForText('Attended a generic teaching session on communication skills.')).toEqual([])
  })

  it('returns an empty array for an empty string', () => {
    expect(suggestTagsForText('')).toEqual([])
  })
})

describe('suggestTagsForText — no duplicates / odd input safety', () => {
  it('never returns a tag more than once even if multiple of its keywords match', () => {
    const text = 'cardiac arrest, chest pain, STEMI, NSTEMI, angina'
    const tags = suggestTagsForText(text)
    const cardiologyCount = tags.filter(tag => tag === 'Cardiology').length
    expect(cardiologyCount).toBe(1)
  })

  it('excludes tags already present in alreadyChosen', () => {
    const tags = suggestTagsForText('chest pain and STEMI', ['Cardiology'])
    expect(tags).not.toContain('Cardiology')
  })

  it('only ever returns tags from the known keyword map (no garbage values)', () => {
    const allKnownTags = new Set(KEYWORD_TAG_MAP.map(([, tag]) => tag))
    const text = 'cardiac resp neuro gastro surg paeds psych ortho derm renal diabet haem itu a&e'
    const tags = suggestTagsForText(text)
    for (const tag of tags) {
      expect(allKnownTags.has(tag)).toBe(true)
    }
  })

  it('does not throw on very long input', () => {
    const longText = 'lorem ipsum '.repeat(5000) + 'chest pain'
    expect(() => suggestTagsForText(longText)).not.toThrow()
    expect(suggestTagsForText(longText)).toContain('Cardiology')
  })

  it('does not throw on input containing unusual unicode/emoji', () => {
    expect(() => suggestTagsForText('🫀 chest pain emoji test 你好')).not.toThrow()
    expect(suggestTagsForText('🫀 chest pain emoji test 你好')).toContain('Cardiology')
  })

  it('handles a whitespace-only string as no match', () => {
    expect(suggestTagsForText('   \n\t  ')).toEqual([])
  })
})
