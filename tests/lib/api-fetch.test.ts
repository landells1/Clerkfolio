// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import { apiFetch, NETWORK_ERROR_MESSAGE } from '@/lib/api-fetch'

function jsonResponse(body: unknown, init: { status?: number; ok?: boolean } = {}) {
  const status = init.status ?? 200
  return {
    ok: init.ok ?? (status >= 200 && status < 300),
    status,
    json: vi.fn(async () => body),
  } as unknown as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiFetch', () => {
  it('returns ok/status/data/response on a successful JSON response', async () => {
    const response = jsonResponse({ hello: 'world' }, { status: 200 })
    vi.stubGlobal('fetch', vi.fn(async () => response))

    const result = await apiFetch('/api/thing')
    expect(result).toEqual({ ok: true, status: 200, data: { hello: 'world' }, response })
  })

  it('surfaces a non-2xx status with ok=false but still parses the JSON body', async () => {
    const response = jsonResponse({ error: 'nope' }, { status: 422, ok: false })
    vi.stubGlobal('fetch', vi.fn(async () => response))

    const result = await apiFetch('/api/thing')
    expect(result.ok).toBe(false)
    expect(result.status).toBe(422)
    expect(result.data).toEqual({ error: 'nope' })
  })

  it('normalizes a network failure (fetch throws) to status: null, data: null, response: null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))

    const result = await apiFetch('/api/thing')
    expect(result).toEqual({ ok: false, status: null, data: null, response: null })
  })

  it('never throws on a network failure (the whole point of the wrapper)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    await expect(apiFetch('/api/thing')).resolves.toBeDefined()
  })

  it('handles a non-JSON response body by resolving data to null instead of throwing', async () => {
    const response = {
      ok: true,
      status: 200,
      json: vi.fn(async () => { throw new SyntaxError('Unexpected end of JSON input') }),
    } as unknown as Response
    vi.stubGlobal('fetch', vi.fn(async () => response))

    const result = await apiFetch('/api/thing')
    expect(result.ok).toBe(true)
    expect(result.status).toBe(200)
    expect(result.data).toBeNull()
  })

  it('does not call response.json() at all when parse: "none" is passed (leaves body unread for blob consumers)', async () => {
    const json = vi.fn(async () => ({ should: 'not be called' }))
    const response = { ok: true, status: 200, json } as unknown as Response
    vi.stubGlobal('fetch', vi.fn(async () => response))

    const result = await apiFetch('/api/download', { parse: 'none' })
    expect(json).not.toHaveBeenCalled()
    expect(result.data).toBeNull()
    expect(result.ok).toBe(true)
    expect(result.response).toBe(response)
  })

  it('forwards RequestInit fields (method/headers/body) to the underlying fetch call, stripping the custom "parse" option', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/api/thing', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ a: 1 }),
      parse: 'json',
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/thing', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ a: 1 }),
    })
  })

  it('exposes the raw Response object so callers can inspect headers etc.', async () => {
    const response = jsonResponse({ a: 1 })
    vi.stubGlobal('fetch', vi.fn(async () => response))

    const result = await apiFetch('/api/thing')
    expect(result.response).toBe(response)
  })

  it('NETWORK_ERROR_MESSAGE is the documented user-facing copy for status === null', () => {
    expect(NETWORK_ERROR_MESSAGE).toBe('Could not reach the server. Check your connection and try again.')
  })
})
