import type { NextRequest } from 'next/server'

// Single source of truth for extracting the caller IP from proxy headers.
// Vercel/most proxies set `x-forwarded-for` (comma-separated, client first);
// `x-real-ip` is the fallback. Returns 'unknown' when neither is present so
// callers always get a stable string key (rate-limit buckets, IP hashing).
//
// Accepts anything with a `headers.get()` (NextRequest in route handlers and
// middleware) so the same logic is used everywhere instead of five copies.
export function requestIp(req: { headers: Pick<Headers, 'get'> } | NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
}
