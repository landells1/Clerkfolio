import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'

export function logBackgroundJobError(context: string, error: unknown, metadata?: Record<string, unknown>) {
  console.error(JSON.stringify({
    level: 'error',
    context,
    message: error instanceof Error ? error.message : String(error),
    metadata: metadata ?? {},
    at: new Date().toISOString(),
  }))
  Sentry.captureException(error, { tags: { context }, extra: metadata })
}

// Sets the Sentry user for the current request scope.
// Call with { id: user.id, tier: user.tier } — never include email.
export function setSentryUser(user: { id: string; tier: string }) {
  Sentry.setUser({ id: user.id, tier: user.tier })
}

type Handler = (req: NextRequest) => Promise<NextResponse | Response>

// Wraps a route handler in a Sentry span and captures any unhandled exceptions.
export function withSentry(name: string, handler: Handler): Handler {
  return async (req: NextRequest): Promise<NextResponse | Response> => {
    return Sentry.startSpan({ name, op: 'api.route' }, async () => {
      try {
        return await handler(req)
      } catch (error) {
        Sentry.captureException(error, { tags: { route: name } })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      }
    })
  }
}
