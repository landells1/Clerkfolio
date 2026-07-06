// @vitest-environment node
import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state: {
  insertShouldFail: boolean
  sendShouldThrow: boolean
} = {
  insertShouldFail: false,
  sendShouldThrow: false,
}

const sendMock = vi.fn(async () => {
  if (state.sendShouldThrow) throw new Error('resend blew up')
  return { data: { id: 'email-id' }, error: null }
})

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock }
  },
}))

import { createNotification, getUserEmail } from '@/lib/notifications/create'

function makeService(): { service: SupabaseClient; insertMock: ReturnType<typeof vi.fn> } {
  const insertMock = vi.fn(async () => ({
    error: state.insertShouldFail ? { message: 'insert failed' } : null,
  }))
  const service = {
    from: vi.fn((table: string) => {
      if (table !== 'notifications') throw new Error(`Unexpected table: ${table}`)
      return { insert: insertMock }
    }),
    auth: {
      admin: {
        getUserById: vi.fn(async () => ({ data: { user: { email: 'doctor@example.com' } }, error: null })),
      },
    },
  }
  return { service: service as unknown as SupabaseClient, insertMock }
}

beforeEach(() => {
  vi.clearAllMocks()
  state.insertShouldFail = false
  state.sendShouldThrow = false
  process.env.RESEND_API_KEY = 'test-resend-key'
})

describe('createNotification', () => {
  it('inserts an in-app notification row with the given fields', async () => {
    const { service, insertMock } = makeService()
    await createNotification(service, {
      userId: 'user-1',
      type: 'billing',
      title: 'Payment received',
      body: 'Thanks for your payment',
      link: '/settings/billing',
    })

    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      type: 'billing',
      title: 'Payment received',
      body: 'Thanks for your payment',
      link: '/settings/billing',
    })
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('defaults body/link to null when omitted', async () => {
    const { service, insertMock } = makeService()
    await createNotification(service, { userId: 'user-1', type: 'password_changed', title: 'Password changed' })

    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      type: 'password_changed',
      title: 'Password changed',
      body: null,
      link: null,
    })
  })

  it('does not send an email when no email payload is passed', async () => {
    const { service } = makeService()
    await createNotification(service, { userId: 'user-1', type: 'billing', title: 'x' })
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('sends an email in addition to the in-app row when an email payload is passed', async () => {
    const { service } = makeService()
    await createNotification(
      service,
      { userId: 'user-1', type: 'billing', title: 'Payment received' },
      { to: 'doctor@example.com', subject: 'Receipt', html: '<p>hi</p>', text: 'hi' },
    )

    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Clerkfolio <noreply@clerkfolio.co.uk>',
        to: 'doctor@example.com',
        subject: 'Receipt',
        html: '<p>hi</p>',
        text: 'hi',
      }),
    )
  })

  it('skips sending when the email payload has an empty "to" address', async () => {
    const { service } = makeService()
    await createNotification(
      service,
      { userId: 'user-1', type: 'billing', title: 'x' },
      { to: '', subject: 's', html: 'h', text: 't' },
    )
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('skips sending when RESEND_API_KEY is not configured, even with a valid email payload', async () => {
    delete process.env.RESEND_API_KEY
    const { service } = makeService()
    await createNotification(
      service,
      { userId: 'user-1', type: 'billing', title: 'x' },
      { to: 'doctor@example.com', subject: 's', html: 'h', text: 't' },
    )
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('a failed in-app insert does not prevent the email from sending (channels are independent)', async () => {
    state.insertShouldFail = true
    const { service, insertMock } = makeService()
    await createNotification(
      service,
      { userId: 'user-1', type: 'billing', title: 'x' },
      { to: 'doctor@example.com', subject: 's', html: 'h', text: 't' },
    )

    expect(insertMock).toHaveBeenCalledTimes(1)
    expect(sendMock).toHaveBeenCalledTimes(1)
  })

  it('a failed email send does not throw and does not undo/retry the in-app insert (channels are independent)', async () => {
    state.sendShouldThrow = true
    const { service, insertMock } = makeService()
    await expect(
      createNotification(
        service,
        { userId: 'user-1', type: 'billing', title: 'x' },
        { to: 'doctor@example.com', subject: 's', html: 'h', text: 't' },
      ),
    ).resolves.toBeUndefined()

    expect(insertMock).toHaveBeenCalledTimes(1)
  })

  it('never throws even when both the insert and the email fail', async () => {
    state.insertShouldFail = true
    state.sendShouldThrow = true
    const { service } = makeService()
    await expect(
      createNotification(
        service,
        { userId: 'user-1', type: 'billing', title: 'x' },
        { to: 'doctor@example.com', subject: 's', html: 'h', text: 't' },
      ),
    ).resolves.toBeUndefined()
  })
})

describe('getUserEmail', () => {
  it('returns the user email on success', async () => {
    const { service } = makeService()
    await expect(getUserEmail(service, 'user-1')).resolves.toBe('doctor@example.com')
  })

  it('returns null when the admin lookup errors', async () => {
    const service = {
      auth: { admin: { getUserById: vi.fn(async () => ({ data: { user: null }, error: { message: 'not found' } })) } },
    } as unknown as SupabaseClient
    await expect(getUserEmail(service, 'missing-user')).resolves.toBeNull()
  })

  it('returns null when the user has no email', async () => {
    const service = {
      auth: { admin: { getUserById: vi.fn(async () => ({ data: { user: { email: null } }, error: null })) } },
    } as unknown as SupabaseClient
    await expect(getUserEmail(service, 'user-1')).resolves.toBeNull()
  })

  it('returns null instead of throwing when the admin call itself throws', async () => {
    const service = {
      auth: { admin: { getUserById: vi.fn(async () => { throw new Error('network down') }) } },
    } as unknown as SupabaseClient
    await expect(getUserEmail(service, 'user-1')).resolves.toBeNull()
  })
})
