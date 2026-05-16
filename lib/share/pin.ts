import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const KEY_LENGTH = 32
// N=2^17 (131072) per OWASP recommendation for sensitive low-entropy inputs.
// Legacy hashes used the Node default N=2^14 (16384) with format scrypt:<salt>:<key>.
// New hashes encode all parameters: scrypt:<N>:<r>:<p>:<salt>:<key> for forward-compat.
const SCRYPT_N = 131072
const SCRYPT_R = 8
const SCRYPT_P = 1

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
  const key = scryptSync(pin, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 256 * 1024 * 1024 }).toString('hex')
  return `scrypt:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${salt}:${key}`
}

export function verifyPin(pin: string, storedHash: string | null) {
  if (!storedHash) return true

  const parts = storedHash.split(':')

  let N: number, r: number, p: number, salt: string, key: string
  if (parts.length === 3) {
    // Legacy format: scrypt:<salt>:<key> — Node defaults N=16384, r=8, p=1
    const [scheme, legacySalt, legacyKey] = parts
    if (scheme !== 'scrypt' || !legacySalt || !legacyKey) return false
    N = 16384; r = 8; p = 1; salt = legacySalt; key = legacyKey
  } else if (parts.length === 6) {
    // New format: scrypt:<N>:<r>:<p>:<salt>:<key>
    const [scheme, rawN, rawR, rawP, paramSalt, paramKey] = parts
    if (scheme !== 'scrypt' || !paramSalt || !paramKey) return false
    N = parseInt(rawN, 10); r = parseInt(rawR, 10); p = parseInt(rawP, 10)
    if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false
    salt = paramSalt; key = paramKey
  } else {
    return false
  }

  const expected = Buffer.from(key, 'hex')
  const actual = scryptSync(pin, salt, expected.length, { N, r, p, maxmem: 256 * 1024 * 1024 })
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

