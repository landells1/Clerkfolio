// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const INACTIVE_USER = {
  id: '11111111-1111-1111-1111-111111111111',
  created_at: '2020-01-01T00:00:00.000Z',
  last_sign_in_at: '2024-01-01T00:00:00.000Z',
}

const state: {
  users: typeof INACTIVE_USER[]
  profileSubscriptionId: string | null
  deletedUserIds: string[]
  signedOutUserIds: string[]
  scheduledSubscriptionIds: string[]
} = {
  users: [],
  profileSubscriptionId: null,
  deletedUserIds: [],
  signedOutUserIds: [],
  scheduledSubscriptionIds: [],
}

vi.mock('@/lib/monitoring', () => ({ logBackgroundJobError: vi.fn() }))
vi.mock('@sentry/nextjs', () => ({
  withMonitor: (_name: string, callback: () => Promise<Response>) => callback(),
}))
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    subscriptions: {
      retrieve: async () => ({ status: 'active', cancel_at_period_end: false }),
      update: async (id: string) => {
        state.scheduledSubscriptionIds.push(id)
        return { status: 'active', cancel_at_period_end: true }
      },
    },
  }),
}))
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    auth: {
      admin: {
        listUsers: async () => ({ data: { users: state.users }, error: null }),
        getUserById: async (id: string) => ({
          data: { user: state.users.find(user => user.id === id) ?? null },
          error: null,
        }),
        signOut: async (id: string) => {
          state.signedOutUserIds.push(id)
          return { error: null }
        },
        deleteUser: async (id: string) => {
          state.deletedUserIds.push(id)
          return { error: null }
        },
      },
    },
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: state.profileSubscriptionId === null
                  ? null
                  : { stripe_subscription_id: state.profileSubscriptionId },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'evidence_files') {
        return {
          select: () => ({
            eq: async () => ({ data: [], error: null }),
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
    storage: { from: () => ({ remove: async () => ({ error: null }) }) },
  }),
}))

import { GET } from '@/app/api/cron/purge-inactive-accounts/route'

function cronRequest() {
  return new NextRequest('https://clerkfolio.co.uk/api/cron/purge-inactive-accounts', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', 'test-cron-secret')
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_retention')
  state.users = []
  state.profileSubscriptionId = null
  state.deletedUserIds = []
  state.signedOutUserIds = []
  state.scheduledSubscriptionIds = []
})

describe('inactive account retention cron', () => {
  it('deletes an account that has not signed in for two years', async () => {
    state.users = [INACTIVE_USER]

    const response = await GET(cronRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ eligible: 1, deleted: 1, failed: 0 })
    expect(state.signedOutUserIds).toEqual([INACTIVE_USER.id])
    expect(state.deletedUserIds).toEqual([INACTIVE_USER.id])
  })

  it('leaves an account with a recent sign-in untouched', async () => {
    state.users = [{ ...INACTIVE_USER, last_sign_in_at: '2026-07-12T00:00:00.000Z' }]

    const response = await GET(cronRequest())

    expect(await response.json()).toMatchObject({ eligible: 0, deleted: 0 })
    expect(state.deletedUserIds).toEqual([])
  })

  it('schedules an active paid subscription to end before deleting data', async () => {
    state.users = [INACTIVE_USER]
    state.profileSubscriptionId = 'sub_inactive_account'

    const response = await GET(cronRequest())

    expect(await response.json()).toMatchObject({ subscription_scheduled: 1, deleted: 0 })
    expect(state.scheduledSubscriptionIds).toEqual(['sub_inactive_account'])
    expect(state.deletedUserIds).toEqual([])
  })
})
