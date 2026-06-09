// @vitest-environment node
//
// Focused tests for the DELETE /api/share revoke handler's audit behaviour
// (QOL-021). Revoking a share link is security-relevant, so it must write a
// `share_link_revoked` audit row alongside share_link_generated/viewed — but
// only when an owned, still-active link is actually revoked. We mock the
// Supabase server clients and CSRF origin check at the module boundary.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const USER_ID = 'user-1'

const state: {
  user: { id: string } | null
  revokedRows: { id: string }[]
  updateError: { message: string } | null
  auditInserts: Array<{ table: string; row: Record<string, unknown> }>
  capturedFilters: Record<string, unknown>
} = {
  user: { id: USER_ID },
  revokedRows: [{ id: 'link-1' }],
  updateError: null,
  auditInserts: [],
  capturedFilters: {},
}

vi.mock('@/lib/csrf', () => ({ validateOrigin: vi.fn(() => null) }))

vi.mock('@/lib/supabase/server', () => {
  function userClient() {
    return {
      auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
      from: (table: string) => {
        if (table === 'share_links') {
          // .update({...}).eq('id').eq('user_id').eq('revoked', false).select('id')
          const chain = {
            eq: (key: string, value: unknown) => { state.capturedFilters[key] = value; return chain },
            select: async () => ({ data: state.revokedRows, error: state.updateError }),
          }
          return { update: () => chain }
        }
        return {}
      },
    }
  }
  function serviceClient() {
    return {
      from: (table: string) => ({
        insert: async (row: Record<string, unknown>) => {
          state.auditInserts.push({ table, row })
          return { data: null, error: null }
        },
      }),
    }
  }
  return {
    createClient: async () => userClient(),
    createServiceClient: () => serviceClient(),
  }
})

// Import AFTER vi.mock so the route picks up the fakes.
import { DELETE as revokeShare } from '@/app/api/share/route'

function makeRequest(id: string | null) {
  const url = id
    ? `https://clerkfolio.co.uk/api/share?id=${id}`
    : 'https://clerkfolio.co.uk/api/share'
  return new NextRequest(url, { method: 'DELETE', headers: { origin: 'https://clerkfolio.co.uk' } })
}

describe('DELETE /api/share — share_link_revoked audit (QOL-021)', () => {
  beforeEach(() => {
    state.user = { id: USER_ID }
    state.revokedRows = [{ id: 'link-1' }]
    state.updateError = null
    state.auditInserts = []
    state.capturedFilters = {}
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role')
  })

  it('writes a share_link_revoked audit row when an owned active link is revoked', async () => {
    const res = await revokeShare(makeRequest('link-1'))
    expect(res.status).toBe(200)
    expect(state.auditInserts).toHaveLength(1)
    expect(state.auditInserts[0]).toMatchObject({
      table: 'audit_log',
      row: { user_id: USER_ID, action: 'share_link_revoked', metadata: { share_link_id: 'link-1' } },
    })
    // Scoped to the owner's still-active link.
    expect(state.capturedFilters).toMatchObject({ id: 'link-1', user_id: USER_ID, revoked: false })
  })

  it('does not write an audit row when no active owned link matched (already revoked / not owner)', async () => {
    state.revokedRows = []
    const res = await revokeShare(makeRequest('link-1'))
    expect(res.status).toBe(200)
    expect(state.auditInserts).toHaveLength(0)
  })

  it('does not write an audit row when the service role key is absent', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    const res = await revokeShare(makeRequest('link-1'))
    expect(res.status).toBe(200)
    expect(state.auditInserts).toHaveLength(0)
  })

  it('requires an id', async () => {
    const res = await revokeShare(makeRequest(null))
    expect(res.status).toBe(400)
    expect(state.auditInserts).toHaveLength(0)
  })
})
