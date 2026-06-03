import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type RateLimitOptions = {
  key: string
  max: number
  windowSeconds: number
  prefix: string
  requireDistributed?: boolean
}

type RateLimitCheck = {
  success: boolean
  limit: number
  remaining: number
  reset: number
  unavailable?: boolean
}

const redisConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
)

const redis = redisConfigured ? Redis.fromEnv() : null
const limiters = new Map<string, Ratelimit>()

const RATE_LIMIT_GLOBAL_KEY = '__clerkfolio_local_rate_limits__'
const globalScope = globalThis as Record<string, unknown>
const localLimits: Map<string, { timestamps: number[] }> =
  (globalScope[RATE_LIMIT_GLOBAL_KEY] as Map<string, { timestamps: number[] }>) ??
  (globalScope[RATE_LIMIT_GLOBAL_KEY] = new Map())

// Timestamp of the last full eviction sweep over `localLimits` (see below).
let lastSweep = 0

function localSlidingWindow({ key, max, windowSeconds, prefix }: RateLimitOptions): RateLimitCheck {
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const bucketKey = `${prefix}:${key}`
  const existing = localLimits.get(bucketKey)?.timestamps ?? []
  const timestamps = existing.filter(timestamp => now - timestamp < windowMs)

  if (timestamps.length >= max) {
    const oldest = timestamps[0] ?? now
    return {
      success: false,
      limit: max,
      remaining: 0,
      reset: oldest + windowMs,
    }
  }

  timestamps.push(now)
  localLimits.set(bucketKey, { timestamps })

  // Opportunistic eviction: once a window's worth of requests has elapsed we
  // sweep buckets whose timestamps have all expired. Without this, every
  // distinct IP / calendar token / share token leaves a permanent (empty)
  // bucket and the map grows unbounded on long-lived instances when Upstash
  // is absent. Throttled to once per window so the sweep cost is amortised.
  if (now - lastSweep > windowMs) {
    lastSweep = now
    for (const [existingKey, bucket] of localLimits) {
      if (bucket.timestamps.every(timestamp => now - timestamp >= windowMs)) {
        localLimits.delete(existingKey)
      }
    }
  }

  return {
    success: true,
    limit: max,
    remaining: Math.max(0, max - timestamps.length),
    reset: now + windowMs,
  }
}

function getLimiter(prefix: string, max: number, windowSeconds: number) {
  if (!redis) return null

  const limiterKey = `${prefix}:${max}:${windowSeconds}`
  const existing = limiters.get(limiterKey)
  if (existing) return existing

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, `${windowSeconds} s`),
    prefix,
  })
  limiters.set(limiterKey, limiter)
  return limiter
}

// When Upstash is configured (UPSTASH_REDIS_REST_URL + TOKEN env vars present)
// we get cross-lambda sliding-window rate limiting. When it's not, we fall back
// to a per-instance in-memory bucket with a one-time warning log. Per-instance
// is weaker than cross-cluster - a determined attacker can hit cold-started
// replicas to multiply their effective quota - but it's still better than
// either (a) silently fail-closing every request (which broke feedback and
// would have broken PDF export here) or (b) fail-opening with no limit at all.
let warnedNoRedis = false
let warnedUpstashError = false
export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitCheck> {
  const limiter = getLimiter(options.prefix, options.max, options.windowSeconds)
  if (limiter) {
    try {
      return await limiter.limit(options.key)
    } catch (err) {
      // Upstash REST unreachable (network blip, quota, outage). Without this
      // guard the rejection propagates as an unhandled 500 on every
      // rate-limited route (feedback, calendar feed, share access, public
      // API). A limiter outage should fail soft, not take routes down.
      if (!warnedUpstashError) {
        warnedUpstashError = true
        console.warn('[rate-limit] Upstash limiter threw; falling back to in-memory bucket.', err instanceof Error ? err.message : err)
      }
      // Routes that demand cluster-wide enforcement (public API) must not be
      // silently downgraded to per-instance limiting - fail closed instead.
      if (options.requireDistributed) {
        return {
          success: false,
          limit: options.max,
          remaining: 0,
          reset: Date.now() + options.windowSeconds * 1000,
          unavailable: true,
        }
      }
      return localSlidingWindow(options)
    }
  }

  if (process.env.NODE_ENV === 'production' && options.requireDistributed) {
    return {
      success: false,
      limit: options.max,
      remaining: 0,
      reset: Date.now() + options.windowSeconds * 1000,
      unavailable: true,
    }
  }

  if (process.env.NODE_ENV === 'production' && !warnedNoRedis) {
    warnedNoRedis = true
    console.warn('[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not configured - using per-instance in-memory bucket. Set the Upstash env vars on Vercel for cluster-wide limiting.')
  }
  return localSlidingWindow(options)
}

export function rateLimitHeaders(result: RateLimitCheck, windowSeconds: number) {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000)),
    'X-RateLimit-Window': String(windowSeconds),
    'Retry-After': String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))),
  }
}
