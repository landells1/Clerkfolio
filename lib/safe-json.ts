import { NextRequest, NextResponse } from 'next/server'

/**
 * Parse a JSON request body without throwing on malformed input.
 * Returns null when the body is missing, empty, or invalid JSON.
 *
 * Use this in every route that expects a JSON body. Raw `await req.json()`
 * surfaces as an uncaught `SyntaxError` that Next.js returns as a 500 - which
 * is misleading (the client sent bad data) and noisy in logs.
 */
export async function safeJsonBody<T = unknown>(req: NextRequest): Promise<T | null> {
  try {
    return (await req.json()) as T
  } catch {
    return null
  }
}

/** Standard 400 response for malformed JSON bodies. */
export function badJson(message = 'Invalid JSON body') {
  return NextResponse.json({ error: message }, { status: 400 })
}
