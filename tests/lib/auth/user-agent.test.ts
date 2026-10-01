// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { describeUserAgent, readSessionIdFromJwt } from '@/lib/auth/user-agent'

describe('describeUserAgent', () => {
  it('names common browsers and devices', () => {
    expect(describeUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36')).toBe('Chrome on Windows')
    expect(describeUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0')).toBe('Edge on Windows')
    expect(describeUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')).toBe('Safari on iPhone')
    expect(describeUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:131.0) Gecko/20100101 Firefox/131.0')).toBe('Firefox on Mac')
  })

  it('falls back gracefully', () => {
    expect(describeUserAgent(null)).toBe('Unknown browser')
    expect(describeUserAgent('unknown')).toBe('Unknown browser')
    expect(describeUserAgent('curl/8.0')).toBe('Unknown browser')
  })
})

describe('readSessionIdFromJwt', () => {
  function jwt(payload: object) {
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    return `header.${b64}.signature`
  }

  it('reads the session_id claim', () => {
    expect(readSessionIdFromJwt(jwt({ session_id: 'abc-123', sub: 'u' }))).toBe('abc-123')
  })

  it('returns null for missing or malformed tokens', () => {
    expect(readSessionIdFromJwt(undefined)).toBeNull()
    expect(readSessionIdFromJwt('not-a-jwt')).toBeNull()
    expect(readSessionIdFromJwt(jwt({ sub: 'u' }))).toBeNull()
  })
})
