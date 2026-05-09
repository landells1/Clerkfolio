import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type RateLimitOptions = {
  key: string
  max: number
  windowSeconds: number
  prefix: string
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

export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitCheck> {
  const limiter = getLimiter(options.prefix, options.max, options.windowSeconds)

  if (limiter) {
    return limiter.limit(options.key)
  }

  if (process.env.NODE_ENV === 'production') {
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

export function rateLimitHeaders(result: RateLimitCheck, windowSeconds: number) {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000)),
    'X-RateLimit-Window': String(windowSeconds),
    'Retry-After': String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))),
  }
}
