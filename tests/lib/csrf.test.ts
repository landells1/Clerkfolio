// @vitest-environment node
//
// ALLOWED_ORIGINS is a module-level const built at import time from env vars.
// Tests use the two origins that are always present (no env var needed):
//   https://clerkfolio.co.uk | https://www.clerkfolio.co.uk
// clerkfolio.vercel.app was removed from the allowlist (#19 fix).
// Localhost is only added when NODE_ENV === 'development'; vitest sets 'test'.
import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { validateOrigin } from '@/lib/csrf'

function makeRequest(
  method: string,
  headers: Record<string, string> = {},
  url = 'https://clerkfolio.co.uk/api/test',
) {
  return new NextRequest(url, { method, headers })
}

describe('validateOrigin — allowed origins', () => {
  it('permits a POST from clerkfolio.co.uk', () => {
    const req = makeRequest('POST', { origin: 'https://clerkfolio.co.uk' })
    expect(validateOrigin(req)).toBeNull()
  })

  it('permits a POST from www.clerkfolio.co.uk', () => {
    const req = makeRequest('POST', { origin: 'https://www.clerkfolio.co.uk' })
    expect(validateOrigin(req)).toBeNull()
  })

  it('blocks a POST from the removed Vercel preview origin (#19)', async () => {
    const req = makeRequest('POST', { origin: 'https://clerkfolio.vercel.app' })
    const res = validateOrigin(req)
    expect(res).not.toBeNull()
    expect(res?.status).toBe(403)
  })
})

describe('validateOrigin — blocked origins', () => {
  it('blocks a POST from an unknown origin', async () => {
    const req = makeRequest('POST', { origin: 'https://evil.example.com' })
    const res = validateOrigin(req)
    expect(res).not.toBeNull()
    expect(res?.status).toBe(403)
  })

  it('blocks a POST from a subdomain of a valid domain', async () => {
    const req = makeRequest('POST', { origin: 'https://sub.clerkfolio.co.uk' })
    const res = validateOrigin(req)
    expect(res).not.toBeNull()
    expect(res?.status).toBe(403)
  })

  it('blocks a POST when origin is an HTTP (not HTTPS) version of an allowed domain', async () => {
    const req = makeRequest('POST', { origin: 'http://clerkfolio.co.uk' })
    const res = validateOrigin(req)
    expect(res).not.toBeNull()
    expect(res?.status).toBe(403)
  })
})

describe('validateOrigin — missing Origin header', () => {
  it('permits GET with no Origin (browser same-origin or server request)', () => {
    const req = makeRequest('GET')
    expect(validateOrigin(req)).toBeNull()
  })

  it('permits HEAD with no Origin', () => {
    const req = makeRequest('HEAD')
    expect(validateOrigin(req)).toBeNull()
  })

  it('permits OPTIONS with no Origin', () => {
    const req = makeRequest('OPTIONS')
    expect(validateOrigin(req)).toBeNull()
  })

  it('blocks POST with no Origin (#19: Referer fallback removed for mutating requests)', async () => {
    const req = makeRequest('POST')
    const res = validateOrigin(req)
    expect(res).not.toBeNull()
    expect(res?.status).toBe(403)
  })

  it('blocks POST with no Origin even if a matching Referer is present (#19)', async () => {
    // Referer fallback removed: Origin is required on all mutating requests.
    const req = makeRequest('POST', { referer: 'https://clerkfolio.co.uk/some/page' })
    const res = validateOrigin(req)
    expect(res).not.toBeNull()
    expect(res?.status).toBe(403)
  })

  it('blocks POST with no Origin and a non-matching Referer', async () => {
    const req = makeRequest('POST', { referer: 'https://evil.example.com/page' })
    const res = validateOrigin(req)
    expect(res).not.toBeNull()
    expect(res?.status).toBe(403)
  })
})
