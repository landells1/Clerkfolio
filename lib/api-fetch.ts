// Client-side fetch wrapper for `/api/*` calls that never throws.
//
// A bare `await fetch(...)` rejects on network failure (offline, DNS, hospital
// wifi dropping mid-request); when a submit handler doesn't catch that, the
// rejection is unhandled and the pending flag ("Generating…", "Sending…")
// sticks until a reload. Every UI call site should use this instead of raw
// fetch so the failure mode is a value, not an exception.
//
// `status === null` means the request never reached the server (network
// failure) - surface the "check your connection" copy for that case.
// `parse: 'none'` leaves the body unread so binary consumers can call
// `response.blob()` themselves.

export type ApiFetchResult<T = Record<string, unknown>> = {
  ok: boolean
  status: number | null
  data: T | null
  response: Response | null
}

export async function apiFetch<T = Record<string, unknown>>(
  input: RequestInfo | URL,
  init?: RequestInit & { parse?: 'json' | 'none' }
): Promise<ApiFetchResult<T>> {
  const { parse = 'json', ...rest } = init ?? {}
  try {
    const response = await fetch(input, rest)
    const data = parse === 'json' ? ((await response.json().catch(() => null)) as T | null) : null
    return { ok: response.ok, status: response.status, data, response }
  } catch {
    return { ok: false, status: null, data: null, response: null }
  }
}

// Standard user-facing copy for `status === null` failures.
export const NETWORK_ERROR_MESSAGE = 'Could not reach the server. Check your connection and try again.'
