import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
    // Warn-only presence check for required secrets (audit I-5) - surfaces a
    // production env-var regression at deploy time instead of when a user
    // first hits the degraded route.
    const { warnOnMissingProductionEnv } = await import('./lib/env-check')
    warnOnMissingProductionEnv()
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
