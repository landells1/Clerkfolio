import { describe, it, expect } from 'vitest'
import {
  validateFeedbackInput,
  buildFeedbackSubject,
  isFeedbackCategory,
  isValidEmail,
  FEEDBACK_CATEGORIES,
  NAME_MAX,
  COMMENT_MAX,
  SPECIALTY_NAME_MAX,
} from '@/lib/feedback/validation'

const validBody = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  comment: 'Great app, thanks!',
}

describe('isFeedbackCategory', () => {
  it('accepts every declared category', () => {
    for (const cat of FEEDBACK_CATEGORIES) {
      expect(isFeedbackCategory(cat)).toBe(true)
    }
  })

  it('rejects unknown strings and non-strings', () => {
    expect(isFeedbackCategory('not_a_category')).toBe(false)
    expect(isFeedbackCategory(123)).toBe(false)
    expect(isFeedbackCategory(undefined)).toBe(false)
    expect(isFeedbackCategory(null)).toBe(false)
  })
})

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('a@b.com')).toBe(true)
  })

  it('rejects malformed addresses', () => {
    expect(isValidEmail('not-an-email')).toBe(false)
    expect(isValidEmail('a@b')).toBe(false)
  })

  it('rejects an address over the length cap', () => {
    const long = `${'a'.repeat(250)}@b.com`
    expect(isValidEmail(long)).toBe(false)
  })
})

describe('validateFeedbackInput', () => {
  it('defaults category to general when omitted (back-compat with older clients)', () => {
    const result = validateFeedbackInput(validBody)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.category).toBe('general')
      expect(result.value.specialty).toBe('')
    }
  })

  it('accepts each declared category explicitly', () => {
    for (const category of FEEDBACK_CATEGORIES) {
      const body = category === 'specialty_request'
        ? { ...validBody, category, specialty: 'Clinical Radiology' }
        : { ...validBody, category }
      const result = validateFeedbackInput(body)
      expect(result.ok).toBe(true)
    }
  })

  it('rejects an unknown category value', () => {
    const result = validateFeedbackInput({ ...validBody, category: 'not_real' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('Invalid category')
  })

  it('requires a specialty name when category is specialty_request', () => {
    const result = validateFeedbackInput({ ...validBody, category: 'specialty_request' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('Please tell us which specialty')
  })

  it('rejects a whitespace-only specialty name for specialty_request', () => {
    const result = validateFeedbackInput({ ...validBody, category: 'specialty_request', specialty: '   ' })
    expect(result.ok).toBe(false)
  })

  it('ignores a specialty value on non-specialty categories', () => {
    const result = validateFeedbackInput({ ...validBody, category: 'bug_report', specialty: 'Cardiology' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.specialty).toBe('')
  })

  it('trims and caps the specialty name length', () => {
    const long = `  ${'x'.repeat(SPECIALTY_NAME_MAX + 50)}  `
    const result = validateFeedbackInput({ ...validBody, category: 'specialty_request', specialty: long })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.specialty.length).toBe(SPECIALTY_NAME_MAX)
  })

  it('rejects non-string field types', () => {
    expect(validateFeedbackInput({ ...validBody, name: 123 }).ok).toBe(false)
    expect(validateFeedbackInput({ ...validBody, email: 123 }).ok).toBe(false)
    expect(validateFeedbackInput({ ...validBody, comment: 123 }).ok).toBe(false)
    expect(validateFeedbackInput({ ...validBody, category: 'general', specialty: 123 }).ok).toBe(false)
  })

  it('rejects non-object bodies', () => {
    expect(validateFeedbackInput(null).ok).toBe(false)
    expect(validateFeedbackInput('a string').ok).toBe(false)
    expect(validateFeedbackInput(undefined).ok).toBe(false)
  })

  it('rejects missing required fields after trimming', () => {
    expect(validateFeedbackInput({ ...validBody, name: '   ' }).ok).toBe(false)
    expect(validateFeedbackInput({ ...validBody, comment: '' }).ok).toBe(false)
  })

  it('rejects an invalid email address', () => {
    const result = validateFeedbackInput({ ...validBody, email: 'not-an-email' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('Invalid email address')
  })

  it('caps name and comment length, matching the pre-existing limits', () => {
    const result = validateFeedbackInput({
      ...validBody,
      name: 'a'.repeat(NAME_MAX + 20),
      comment: 'b'.repeat(COMMENT_MAX + 20),
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.name.length).toBe(NAME_MAX)
      expect(result.value.comment.length).toBe(COMMENT_MAX)
    }
  })

  it('lowercases and trims email', () => {
    const result = validateFeedbackInput({ ...validBody, email: '  Jane@Example.COM  ' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.email).toBe('jane@example.com')
  })
})

describe('buildFeedbackSubject', () => {
  it('includes the category label', () => {
    const subject = buildFeedbackSubject({ name: 'Jane', email: 'a@b.com', comment: 'x', category: 'bug_report', specialty: '' })
    expect(subject).toContain('Bug report')
    expect(subject).toContain('Jane')
  })

  it('includes the specialty name for specialty_request', () => {
    const subject = buildFeedbackSubject({ name: 'Jane', email: 'a@b.com', comment: 'x', category: 'specialty_request', specialty: 'Clinical Radiology' })
    expect(subject).toContain('Request a specialty')
    expect(subject).toContain('Clinical Radiology')
  })

  it('omits the trailing colon when no specialty is set', () => {
    const subject = buildFeedbackSubject({ name: 'Jane', email: 'a@b.com', comment: 'x', category: 'general', specialty: '' })
    expect(subject).not.toContain(':')
  })
})
