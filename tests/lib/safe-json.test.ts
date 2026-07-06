// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { safeJsonBody, badJson } from '@/lib/safe-json'

function makeRequest(body?: string, contentType = 'application/json') {
  return new NextRequest('https://clerkfolio.co.uk/api/thing', {
    method: 'POST',
    headers: contentType ? { 'content-type': contentType } : undefined,
    body,
  })
}

describe('safeJsonBody', () => {
  it('parses a valid JSON body', async () => {
    const req = makeRequest(JSON.stringify({ a: 1, b: 'two' }))
    await expect(safeJsonBody(req)).resolves.toEqual({ a: 1, b: 'two' })
  })

  it('returns null for malformed JSON instead of throwing', async () => {
    const req = makeRequest('{not valid json')
    await expect(safeJsonBody(req)).resolves.toBeNull()
  })

  it('returns null for a missing/empty body', async () => {
    const req = makeRequest(undefined)
    await expect(safeJsonBody(req)).resolves.toBeNull()
  })

  it('returns null for a body that is valid JSON but not the expected shape (still parses, caller types it)', async () => {
    const req = makeRequest(JSON.stringify('just a string'))
    await expect(safeJsonBody(req)).resolves.toBe('just a string')
  })
})

describe('badJson', () => {
  it('returns a 400 response with the default message', async () => {
    const res = badJson()
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toEqual({ error: 'Invalid JSON body' })
  })

  it('returns a 400 response with a custom message', async () => {
    const res = badJson('Body must include an email field')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toEqual({ error: 'Body must include an email field' })
  })
})
