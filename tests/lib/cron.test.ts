// @vitest-environment node
//
// Cron authorization tests (P3-d). Every cron route does service-role work
// (purges, digests, vesting) and must be gated by validateCronSecret first,
// or an unauthenticated request could trigger it. Two layers:
//   1. unit tests of validateCronSecret itself (the timing-safe Bearer check), and
//   2. a structural guard that every app/api/cron/*/route.ts actually calls
//      validateCronSecret BEFORE it constructs a service-role client — so a new
//      cron route can't ship ungated.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { NextRequest } from 'next/server'
import { validateCronSecret } from '@/lib/cron'

const SECRET = 'test-cron-secret'

function reqWithAuth(header: string | null) {
  return new NextRequest('https://clerkfolio.co.uk/api/cron/anything', {
    headers: header === null ? {} : { authorization: header },
  })
}

describe('validateCronSecret', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', SECRET)
  })

  it('passes (returns null) with the correct Bearer secret', () => {
    expect(validateCronSecret(reqWithAuth(`Bearer ${SECRET}`))).toBeNull()
  })

  it('rejects a wrong secret with 401', () => {
    const res = validateCronSecret(reqWithAuth('Bearer nope'))
    expect(res?.status).toBe(401)
  })

  it('rejects a missing authorization header with 401', () => {
    const res = validateCronSecret(reqWithAuth(null))
    expect(res?.status).toBe(401)
  })

  it('rejects when CRON_SECRET is unset (never open by default)', () => {
    vi.stubEnv('CRON_SECRET', '')
    const res = validateCronSecret(reqWithAuth('Bearer anything'))
    expect(res?.status).toBe(401)
  })
})

describe('every cron route is gated before service-role work', () => {
  const cronDir = join(process.cwd(), 'app', 'api', 'cron')
  const routeFiles = readdirSync(cronDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => join(cronDir, entry.name, 'route.ts'))

  it('found the cron routes', () => {
    expect(routeFiles.length).toBeGreaterThan(0)
  })

  it.each(routeFiles)('%s calls validateCronSecret before createServiceClient', file => {
    const source = readFileSync(file, 'utf8')
    const guardIdx = source.indexOf('validateCronSecret(')
    expect(guardIdx, 'route must call validateCronSecret').toBeGreaterThan(-1)

    const serviceIdx = source.indexOf('createServiceClient(')
    if (serviceIdx > -1) {
      // The auth gate must run before any service-role client is built.
      expect(guardIdx).toBeLessThan(serviceIdx)
    }
  })
})
