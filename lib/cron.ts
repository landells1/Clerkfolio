import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'

// Compare via SHA-256 digests so the comparison is constant-time and the two
// inputs are always equal-length (timingSafeEqual throws on length mismatch).
// Mirrors the timing-safe PIN verifier in lib/share/pin.ts.
function secretMatches(provided: string, expected: string) {
  const a = createHash('sha256').update(provided).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

export function validateCronSecret(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET
  const header = request.headers.get('authorization') ?? ''
  if (!cronSecret || !secretMatches(header, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
