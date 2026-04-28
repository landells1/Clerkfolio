import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const KEY_LENGTH = 32

export function createShareToken() {
  return randomBytes(24).toString('hex')
}

export function normalizePin(pin: unknown) {
  if (typeof pin !== 'string') return null
  const trimmed = pin.trim()
  return /^\d{4,8}$/.test(trimmed) ? trimmed : null
}

export function hashPin(pin: string) {
  const salt = randomBytes(16).toString('hex')
  const key = scryptSync(pin, salt, KEY_LENGTH).toString('hex')
  return `scrypt:${salt}:${key}`
}

export function verifyPin(pin: string, storedHash: string | null) {
  if (!storedHash) return true

  const [scheme, salt, key] = storedHash.split(':')
  if (scheme !== 'scrypt' || !salt || !key) return false

  const expected = Buffer.from(key, 'hex')
  const actual = scryptSync(pin, salt, expected.length)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

