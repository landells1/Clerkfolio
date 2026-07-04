// @vitest-environment node
//
// Regression tests for GET /api/calendar/feed/[token] (P3-a). This route
// shipped the silent F-020 bug: it selected a non-existent deadlines.updated_at
// column, so the query errored and the route returned 200 with ONLY config
// deadlines — dropping every user-created Timeline deadline from the ICS that
// calendar apps subscribe to. These tests pin the three things that matter:
//   1. the deadlines select shape matches exactly what the VEVENT builder reads
//      (so re-adding an unused/missing column can't silently break it again),
//   2. a query error fails LOUD (500), never a partial 200, and
//   3. user-created deadlines actually appear in the ICS body.
// We mock the Supabase service client, rate limiter, and IP extractor at the
// module boundary (same approach as tests/lib/share/revoke-audit.test.ts).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

type QueryResult = { data: unknown; error: { message: string } | null }

const state: {
  profile: QueryResult
  deadlines: QueryResult
  goals: QueryResult
  specialties: QueryResult
  selects: Record<string, string>
} = {
  profile: { data: { id: 'user-1' }, error: null },
  deadlines: { data: [], error: null },
  goals: { data: [], error: null },
  specialties: { data: [], error: null },
  selects: {},
}

// A chainable, awaitable query stub. Builder methods return the same object;
// awaiting it (or calling maybeSingle) resolves to the table's result. `select`
// records the requested columns so a test can assert the select shape.
function makeQuery(table: string, result: QueryResult) {
  const q: Record<string, unknown> = {
    select: (cols: string) => { state.selects[table] = cols; return q },
    eq: () => q,
    is: () => q,
    not: () => q,
    order: () => q,
    maybeSingle: () => Promise.resolve(result),
    then: (onFulfilled: (v: QueryResult) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  }
  return q
}

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ success: true, unavailable: false })),
  rateLimitHeaders: vi.fn(() => ({})),
}))

vi.mock('@/lib/request-ip', () => ({ requestIp: () => '203.0.113.7' }))

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === 'profiles') return makeQuery('profiles', state.profile)
      if (table === 'deadlines') return makeQuery('deadlines', state.deadlines)
      if (table === 'goals') return makeQuery('goals', state.goals)
      if (table === 'specialty_applications') return makeQuery('specialty_applications', state.specialties)
      return makeQuery(table, { data: [], error: null })
    },
  }),
}))

// Import AFTER vi.mock so the route picks up the fakes.
import { GET as calendarFeed } from '@/app/api/calendar/feed/[token]/route'

function callFeed(token = 'feed-token') {
  const req = new NextRequest(`https://clerkfolio.co.uk/api/calendar/feed/${token}`)
  return calendarFeed(req, { params: Promise.resolve({ token }) })
}

describe('GET /api/calendar/feed/[token]', () => {
  beforeEach(() => {
    state.profile = { data: { id: 'user-1' }, error: null }
    state.deadlines = { data: [], error: null }
    state.goals = { data: [], error: null }
    state.specialties = { data: [], error: null }
    state.selects = {}
  })

  it('selects exactly the columns the VEVENT builder reads (F-020 guard)', async () => {
    await callFeed()
    // Must be exactly these — re-adding updated_at/created_at is what broke it.
    expect(state.selects.deadlines).toBe('id, title, due_date, details, location, source_specialty_key')
  })

  it('includes user-created deadlines in the ICS body', async () => {
    state.deadlines = {
      data: [
        { id: 'd1', title: 'Portfolio review meeting', due_date: '2026-09-01', details: 'Bring evidence', location: null, source_specialty_key: null },
      ],
      error: null,
    }
    const res = await callFeed()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/calendar')
    const body = await res.text()
    expect(body).toContain('SUMMARY:Portfolio review meeting')
    expect(body).toContain('DTSTART;VALUE=DATE:20260901')
    expect(body).toContain('UID:d1@')
  })

  it('fails loud (500) when the deadlines query errors, never a partial 200', async () => {
    state.deadlines = { data: null, error: { message: 'column does not exist' } }
    const res = await callFeed()
    expect(res.status).toBe(500)
  })

  it('fails loud (500) when the profile lookup errors', async () => {
    state.profile = { data: null, error: { message: 'db down' } }
    const res = await callFeed()
    expect(res.status).toBe(500)
  })

  it('returns 404 for an unknown token (clean no-match, not an error)', async () => {
    state.profile = { data: null, error: null }
    const res = await callFeed()
    expect(res.status).toBe(404)
  })
})
