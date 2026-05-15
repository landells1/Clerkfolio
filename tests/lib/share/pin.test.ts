// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createShareToken, normalizePin, hashPin, verifyPin } from '@/lib/share/pin'

describe('normalizePin', () => {
  it('accepts 4-digit PINs', () => expect(normalizePin('1234')).toBe('1234'))
  it('accepts 8-digit PINs', () => expect(normalizePin('12345678')).toBe('12345678'))
  it('trims surrounding whitespace', () => expect(normalizePin('  4567  ')).toBe('4567'))

  it('rejects PINs that are too short', () => expect(normalizePin('123')).toBeNull())
  it('rejects PINs that are too long', () => expect(normalizePin('123456789')).toBeNull())
  it('rejects non-numeric input', () => expect(normalizePin('abcd')).toBeNull())
  it('rejects PINs with internal spaces', () => expect(normalizePin('12 34')).toBeNull())
  it('rejects null', () => expect(normalizePin(null)).toBeNull())
  it('rejects undefined', () => expect(normalizePin(undefined)).toBeNull())
  it('rejects number type (must be string)', () => expect(normalizePin(1234)).toBeNull())
  it('rejects empty string', () => expect(normalizePin('')).toBeNull())
})

describe('hashPin / verifyPin roundtrip', () => {
  it('verifies the correct PIN against its hash', () => {
    const hash = hashPin('4321')
    expect(verifyPin('4321', hash)).toBe(true)
  })

  it('rejects a wrong PIN', () => {
    const hash = hashPin('4321')
    expect(verifyPin('9999', hash)).toBe(false)
  })

  it('treats a null stored hash as no PIN required (open access)', () => {
    expect(verifyPin('anything', null)).toBe(true)
  })

  it('rejects a completely malformed hash', () => {
    expect(verifyPin('1234', 'not-a-hash')).toBe(false)
  })

  it('rejects a hash with missing key segment', () => {
    expect(verifyPin('1234', 'scrypt:somesalt')).toBe(false)
  })

  it('produces a unique salt on each call (hashes differ)', () => {
    const h1 = hashPin('5678')
    const h2 = hashPin('5678')
    expect(h1).not.toBe(h2)
  })

  it('both independently-salted hashes still verify', () => {
    const h1 = hashPin('5678')
    const h2 = hashPin('5678')
    expect(verifyPin('5678', h1)).toBe(true)
    expect(verifyPin('5678', h2)).toBe(true)
  })

  it('stores hash in scrypt:<salt>:<key> format', () => {
    const hash = hashPin('0000')
    const parts = hash.split(':')
    expect(parts[0]).toBe('scrypt')
    expect(parts).toHaveLength(3)
    expect(parts[1]).toMatch(/^[0-9a-f]+$/)
    expect(parts[2]).toMatch(/^[0-9a-f]+$/)
  })
})

describe('createShareToken', () => {
  it('returns a 48-character lowercase hex string', () => {
    const token = createShareToken()
    expect(token).toMatch(/^[0-9a-f]{48}$/)
  })

  it('produces unique tokens across many calls', () => {
    const tokens = new Set(Array.from({ length: 50 }, createShareToken))
    expect(tokens.size).toBe(50)
  })
})
