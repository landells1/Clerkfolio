// @vitest-environment node
//
// Upstash env vars are not set in tests so checkRateLimit falls through to the
// per-instance in-memory sliding-window fallback. Tests verify that fallback's
// behaviour without any Upstash dependency.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'

const GLOBAL_KEY = '__clerkfolio_local_rate_limits__'

function clearLocalLimits() {
  const map = (globalThis as Record<string, unknown>)[GLOBAL_KEY] as Map<string, unknown> | undefined
  map?.clear()
}

beforeEach(clearLocalLimits)
afterEach(() => vi.unstubAllEnvs())

describe('checkRateLimit — in-memory fallback (no Upstash)', () => {
  it('allows the first request', async () => {
    const result = await checkRateLimit({ key: 'test-ip', max: 3, windowSeconds: 60, prefix: 'test' })
    expect(result.success).toBe(true)
    expect(result.limit).toBe(3)
    expect(result.remaining).toBe(2)
  })

  it('tracks remaining correctly across multiple requests', async () => {
    const opts = { key: 'multi-ip', max: 3, windowSeconds: 60, prefix: 'test' }
    await checkRateLimit(opts)
    await checkRateLimit(opts)
    const third = await checkRateLimit(opts)
    expect(third.success).toBe(true)
    expect(third.remaining).toBe(0)
  })

  it('blocks once the limit is exceeded', async () => {
    const opts = { key: 'block-ip', max: 2, windowSeconds: 60, prefix: 'test' }
    await checkRateLimit(opts)
    await checkRateLimit(opts)
    const over = await checkRateLimit(opts)
    expect(over.success).toBe(false)
    expect(over.remaining).toBe(0)
  })

  it('uses separate buckets per prefix', async () => {
    const key = 'shared-key'
    const opts1 = { key, max: 1, windowSeconds: 60, prefix: 'ns-a' }
    const opts2 = { key, max: 1, windowSeconds: 60, prefix: 'ns-b' }
    await checkRateLimit(opts1) // exhausts ns-a
    const r2 = await checkRateLimit(opts2) // ns-b is independent
    expect(r2.success).toBe(true)
  })

  it('separates buckets by key within the same prefix', async () => {
    const opts = { max: 1, windowSeconds: 60, prefix: 'test' }
    await checkRateLimit({ ...opts, key: 'ip-a' }) // exhausts ip-a
    const r = await checkRateLimit({ ...opts, key: 'ip-b' }) // ip-b is fresh
    expect(r.success).toBe(true)
  })

  it('evicts buckets whose timestamps have all expired', async () => {
    // The sweep throttle compares against a module-level `lastSweep` that prior
    // tests advanced using the real clock, so start fake time *after* real now
    // to guarantee the throttle window has elapsed.
    const base = Date.now() + 60_000
    vi.useFakeTimers()
    try {
      vi.setSystemTime(base)
      const map = (globalThis as Record<string, unknown>)[GLOBAL_KEY] as Map<string, unknown>

      await checkRateLimit({ key: 'evict-a', max: 5, windowSeconds: 1, prefix: 'evict' })
      expect(map.has('evict:evict-a')).toBe(true)

      // Advance well past the 1s window (so evict-a's timestamps expire) and
      // past the sweep throttle, then touch a different bucket to trigger the
      // opportunistic sweep.
      vi.setSystemTime(base + 5_000)
      await checkRateLimit({ key: 'evict-b', max: 5, windowSeconds: 1, prefix: 'evict' })

      expect(map.has('evict:evict-a')).toBe(false)
      expect(map.has('evict:evict-b')).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('rateLimitHeaders', () => {
  it('returns the expected header names', async () => {
    const result = await checkRateLimit({ key: 'hdr', max: 5, windowSeconds: 30, prefix: 'hdr' })
    const headers = rateLimitHeaders(result, 30)
    expect(headers['X-RateLimit-Limit']).toBe('5')
    expect(headers['X-RateLimit-Window']).toBe('30')
    expect(headers).toHaveProperty('X-RateLimit-Remaining')
    expect(headers).toHaveProperty('X-RateLimit-Reset')
    expect(headers).toHaveProperty('Retry-After')
  })

  it('sets Retry-After to at least 1 second when blocked', async () => {
    const opts = { key: 'retry-ip', max: 1, windowSeconds: 60, prefix: 'retry' }
    await checkRateLimit(opts)
    const blocked = await checkRateLimit(opts)
    const headers = rateLimitHeaders(blocked, 60)
    expect(Number(headers['Retry-After'])).toBeGreaterThanOrEqual(1)
  })
})
