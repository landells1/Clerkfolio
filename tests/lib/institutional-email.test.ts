// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  normaliseEmail,
  isValidEmail,
  isAcUkEmail,
  isNhsEmail,
  isInstitutionEmail,
} from '@/lib/institutional-email'

describe('normaliseEmail', () => {
  it('lowercases and trims', () => {
    expect(normaliseEmail('  Alice@Uni.AC.UK  ')).toBe('alice@uni.ac.uk')
  })

  it('caps at 254 chars', () => {
    const long = 'a'.repeat(300) + '@uni.ac.uk'
    const out = normaliseEmail(long)
    expect(out.length).toBeLessThanOrEqual(254)
  })

  it('returns empty string for non-string input', () => {
    expect(normaliseEmail(null)).toBe('')
    expect(normaliseEmail(undefined)).toBe('')
    expect(normaliseEmail(123)).toBe('')
  })
})

describe('isValidEmail', () => {
  it('accepts the obvious shape', () => {
    expect(isValidEmail('alice@uni.ac.uk')).toBe(true)
  })

  it('rejects no @', () => {
    expect(isValidEmail('alice.uni.ac.uk')).toBe(false)
  })

  it('rejects no TLD', () => {
    expect(isValidEmail('alice@uni')).toBe(false)
  })

  it('rejects whitespace', () => {
    expect(isValidEmail('alice @uni.ac.uk')).toBe(false)
  })
})

describe('isAcUkEmail', () => {
  it('accepts plain .ac.uk', () => {
    expect(isAcUkEmail('alice@uni.ac.uk')).toBe(true)
  })

  it('accepts sub-domain .ac.uk', () => {
    expect(isAcUkEmail('alice@students.uni.ac.uk')).toBe(true)
  })

  it('rejects an attacker-suffixed lookalike', () => {
    // The matcher is endsWith('.ac.uk'); ensure obvious lookalikes don't slip
    // through. Anything not actually ending in .ac.uk should be rejected.
    expect(isAcUkEmail('alice@uni.ac.uk.evil.com')).toBe(false)
  })

  it('rejects nhs.uk', () => {
    expect(isAcUkEmail('alice@example.nhs.uk')).toBe(false)
  })

  it('case is the caller\'s responsibility (normaliseEmail first)', () => {
    // isAcUkEmail uses endsWith('.ac.uk') so it is case-sensitive. The whole
    // pipeline starts with normaliseEmail which lowercases.
    expect(isAcUkEmail('alice@uni.AC.UK')).toBe(false)
  })
})

describe('isNhsEmail', () => {
  it('accepts nhs.net exact', () => {
    expect(isNhsEmail('alice@nhs.net')).toBe(true)
  })

  it('accepts hscni.net exact', () => {
    expect(isNhsEmail('alice@hscni.net')).toBe(true)
  })

  it('accepts a *.nhs.uk subdomain', () => {
    expect(isNhsEmail('alice@trust.nhs.uk')).toBe(true)
  })

  it('accepts wales.nhs.uk', () => {
    expect(isNhsEmail('alice@cardiff.wales.nhs.uk')).toBe(true)
  })

  it('accepts nhs.scot', () => {
    expect(isNhsEmail('alice@ggc.nhs.scot')).toBe(true)
  })

  it('rejects non-NHS', () => {
    expect(isNhsEmail('alice@uni.ac.uk')).toBe(false)
    expect(isNhsEmail('alice@example.com')).toBe(false)
  })

  it('rejects an attacker-suffixed lookalike', () => {
    expect(isNhsEmail('alice@trust.nhs.uk.evil.com')).toBe(false)
  })
})

describe('isInstitutionEmail', () => {
  it('accepts AC + NHS', () => {
    expect(isInstitutionEmail('alice@uni.ac.uk')).toBe(true)
    expect(isInstitutionEmail('alice@nhs.net')).toBe(true)
    expect(isInstitutionEmail('alice@trust.nhs.uk')).toBe(true)
  })

  it('rejects non-institution', () => {
    expect(isInstitutionEmail('alice@gmail.com')).toBe(false)
  })
})
