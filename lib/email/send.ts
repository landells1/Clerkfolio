import type { CreateEmailOptions, Resend } from 'resend'

// Resend's SDK RETURNS API errors as `{ error }` instead of throwing, so a
// bare `await resend.emails.send(...)` inside try/catch treated a 401/403/429
// as success - digests and reminders were counted as sent while nothing went
// out, and nothing reached the logs. Every send should go through here.
//
// Resend's default API rate limit is a few requests per second, so a
// rate-limit error is retried with a short backoff before giving up.

export type EmailSendResult = { ok: true; id: string | null } | { ok: false; error: string; code: string | null }

const RATE_LIMIT_RETRIES = 3
const RATE_LIMIT_BACKOFF_MS = 1100

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function sendEmail(resend: Resend, payload: CreateEmailOptions): Promise<EmailSendResult> {
  for (let attempt = 0; ; attempt++) {
    try {
      const { data, error } = await resend.emails.send(payload)
      if (!error) return { ok: true, id: data?.id ?? null }
      if (error.name === 'rate_limit_exceeded' && attempt < RATE_LIMIT_RETRIES) {
        await sleep(RATE_LIMIT_BACKOFF_MS * (attempt + 1))
        continue
      }
      return { ok: false, error: error.message, code: error.name ?? null }
    } catch (err) {
      // Network failure etc. Message only - the raw error can embed the
      // payload (recipient address, share tokens).
      return { ok: false, error: err instanceof Error ? err.message : 'unknown', code: null }
    }
  }
}
