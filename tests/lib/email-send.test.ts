import { describe, it, expect, vi } from 'vitest'
import type { Resend } from 'resend'
import { sendEmail } from '@/lib/email/send'

function fakeResend(responses: Array<{ data?: { id: string } | null; error?: { name: string; message: string } | null } | Error>) {
  const send = vi.fn(async () => {
    const next = responses.shift()
    if (next instanceof Error) throw next
    return { data: next?.data ?? null, error: next?.error ?? null }
  })
  return { resend: { emails: { send } } as unknown as Resend, send }
}

const payload = { from: 'a@example.com', to: 'b@example.com', subject: 's', text: 't' }

describe('sendEmail', () => {
  it('reports success with the message id', async () => {
    const { resend } = fakeResend([{ data: { id: 'msg_1' } }])
    expect(await sendEmail(resend, payload)).toEqual({ ok: true, id: 'msg_1' })
  })

  it('treats a returned error as a failure (the SDK does not throw)', async () => {
    const { resend } = fakeResend([{ error: { name: 'invalid_api_key', message: 'API key is invalid' } }])
    expect(await sendEmail(resend, payload)).toEqual({ ok: false, error: 'API key is invalid', code: 'invalid_api_key' })
  })

  it('retries rate-limit errors before succeeding', async () => {
    vi.useFakeTimers()
    const { resend, send } = fakeResend([
      { error: { name: 'rate_limit_exceeded', message: 'Too many requests' } },
      { data: { id: 'msg_2' } },
    ])
    const pending = sendEmail(resend, payload)
    await vi.runAllTimersAsync()
    expect(await pending).toEqual({ ok: true, id: 'msg_2' })
    expect(send).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('converts thrown network errors into a failure result', async () => {
    const { resend } = fakeResend([new Error('socket hang up')])
    expect(await sendEmail(resend, payload)).toEqual({ ok: false, error: 'socket hang up', code: null })
  })
})
