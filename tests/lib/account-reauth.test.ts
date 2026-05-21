// @vitest-environment node
//
// Tests for current-password reauth on destructive account actions.
// Covers Codex 2026-05-20 #8:
//   - /api/account/password rejects missing/wrong current password.
//   - /api/account/delete rejects missing/wrong current password.
//   - Both call signInWithPassword to verify and only proceed on success.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const USER_ID = '55555555-5555-5555-5555-555555555555'
const USER_EMAIL = 'jetrax20000@gmail.com'

const state: {
  user: { id: string; email: string } | null
  reauthOk: boolean
  adminUpdateError: { message: string } | null
  authDeleteError: { message: string } | null
  signInCallCount: number
  auditInsertCount: number
} = {
  user: { id: USER_ID, email: USER_EMAIL },
  reauthOk: true,
  adminUpdateError: null,
  authDeleteError: null,
  signInCallCount: 0,
  auditInsertCount: 0,
}

vi.mock('@/lib/csrf', () => ({ validateOrigin: vi.fn(() => null) }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: state.user } }),
      signInWithPassword: async () => {
        state.signInCallCount++
        return { error: state.reauthOk ? null : { message: 'invalid' } }
      },
    },
  }),
  createServiceClient: () => ({
    auth: {
      admin: {
        updateUserById: async () => ({ error: state.adminUpdateError }),
        deleteUser: async () => ({ error: state.authDeleteError }),
        signOut: async () => ({ error: null }),
      },
    },
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { stripe_subscription_id: null, subscription_period_end: null },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'evidence_files') {
        return { select: () => ({ eq: async () => ({ data: [], error: null }) }) }
      }
      if (table === 'audit_log') {
        return {
          insert: async () => {
            state.auditInsertCount++
            return { error: null }
          },
        }
      }
      return { select: () => ({ eq: async () => ({ data: [], error: null }) }) }
    },
    storage: {
      from: () => ({
        remove: async () => ({ error: null }),
      }),
    },
  }),
}))

import { POST as changePassword } from '@/app/api/account/password/route'
import { POST as deleteAccount } from '@/app/api/account/delete/route'

function req(path: string, body: Record<string, unknown>) {
  return new NextRequest(`https://clerkfolio.co.uk${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://clerkfolio.co.uk' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  state.user = { id: USER_ID, email: USER_EMAIL }
  state.reauthOk = true
  state.adminUpdateError = null
  state.authDeleteError = null
  state.signInCallCount = 0
  state.auditInsertCount = 0
})

describe('/api/account/password — Codex 2026-05-20 #8 (password change reauth)', () => {
  it('happy path: 200 ok when current password verifies and admin update succeeds', async () => {
    const res = await changePassword(req('/api/account/password', {
      currentPassword: 'correct',
      newPassword: 'newPass1234',
    }))
    expect(res.status).toBe(200)
    expect(state.signInCallCount).toBe(1)
    expect(state.auditInsertCount).toBe(1)
  })

  it('rejects when currentPassword is missing', async () => {
    const res = await changePassword(req('/api/account/password', { newPassword: 'newPass1234' }))
    expect(res.status).toBe(400)
    expect(state.signInCallCount).toBe(0)
  })

  it('rejects when newPassword is missing', async () => {
    const res = await changePassword(req('/api/account/password', { currentPassword: 'x' }))
    expect(res.status).toBe(400)
  })

  it('rejects when newPassword is too short', async () => {
    const res = await changePassword(req('/api/account/password', { currentPassword: 'x', newPassword: 'short' }))
    expect(res.status).toBe(400)
  })

  it('returns 401 when current password is wrong (no admin update fires)', async () => {
    state.reauthOk = false
    const res = await changePassword(req('/api/account/password', {
      currentPassword: 'wrong',
      newPassword: 'newPass1234',
    }))
    expect(res.status).toBe(401)
    expect(state.auditInsertCount).toBe(0)
  })

  it('rejects when not logged in', async () => {
    state.user = null
    const res = await changePassword(req('/api/account/password', {
      currentPassword: 'x', newPassword: 'newPass1234',
    }))
    expect(res.status).toBe(401)
  })
})

describe('/api/account/delete — Codex 2026-05-20 #8 (delete reauth)', () => {
  it('happy path: 200 with correct DELETE + current password', async () => {
    const res = await deleteAccount(req('/api/account/delete', {
      confirm: 'DELETE',
      currentPassword: 'correct',
    }))
    expect(res.status).toBe(200)
    expect(state.signInCallCount).toBe(1)
  })

  it('rejects when confirm text is wrong', async () => {
    const res = await deleteAccount(req('/api/account/delete', {
      confirm: 'delete',
      currentPassword: 'correct',
    }))
    expect(res.status).toBe(400)
    expect(state.signInCallCount).toBe(0)
  })

  it('rejects when currentPassword is missing', async () => {
    const res = await deleteAccount(req('/api/account/delete', { confirm: 'DELETE' }))
    expect(res.status).toBe(400)
    expect(state.signInCallCount).toBe(0)
  })

  it('returns 401 when current password is wrong (no destructive work)', async () => {
    state.reauthOk = false
    const res = await deleteAccount(req('/api/account/delete', {
      confirm: 'DELETE',
      currentPassword: 'wrong',
    }))
    expect(res.status).toBe(401)
  })
})
