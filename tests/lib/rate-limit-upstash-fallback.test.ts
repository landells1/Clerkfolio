// @vitest-environment node
//
// When Upstash IS configured but the REST call throws (network blip, quota,
// outage), checkRateLimit must fail soft for ordinary routes (fall back to the
// in-memory bucket) and fail closed for routes that require cluster-wide
// enforcement (the public API). These tests mock the Upstash SDK so the
// limiter is constructed but its .limit() rejects.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: () => ({}) },
}))

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow() {
      return {}
    }
    limit() {
      return Promise.reject(new Error('upstash unreachable'))
    }
  },
}))

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io')
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('checkRateLimit — Upstash throws', () => {
  it('falls back to the in-memory bucket for ordinary routes', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { checkRateLimit } = await import('@/lib/rate-limit')

    const result = await checkRateLimit({ key: 'soft-ip', max: 5, windowSeconds: 60, prefix: 'soft-fallback' })

    expect(result.success).toBe(true)
    expect(result.unavailable).toBeUndefined()
    expect(warn).toHaveBeenCalled()
  })

  it('fails closed for routes that require distributed limiting', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { checkRateLimit } = await import('@/lib/rate-limit')

    const result = await checkRateLimit({
      key: 'closed-ip',
      max: 60,
      windowSeconds: 60,
      prefix: 'apikey',
      requireDistributed: true,
    })

    expect(result.success).toBe(false)
    expect(result.unavailable).toBe(true)
  })
})
