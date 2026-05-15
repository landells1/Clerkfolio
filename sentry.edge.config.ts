import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? 'development',
  tracesSampleRate: (process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV) === 'production' ? 0.1 : 1.0,
  sendDefaultPii: false,
})
