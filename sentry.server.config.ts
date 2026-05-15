import * as Sentry from '@sentry/nextjs'

const isProd = (process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV) === 'production'

const sensitivePattern = /email|password|token|stripe|key|secret/i

function redact(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(redact)
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
      k,
      sensitivePattern.test(k) ? '[Filtered]' : redact(v),
    ])
  )
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? 'development',

  tracesSampleRate: isProd ? 0.1 : 1.0,

  sendDefaultPii: false,

  beforeSend(event) {
    const message = event.exception?.values?.[0]?.value ?? ''

    if (
      /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/.test(message) ||
      message.includes('Route Cancelled') ||
      message.includes('The user aborted a request')
    ) {
      return null
    }

    if (event.request?.headers) {
      const h = event.request.headers as Record<string, string>
      delete h['cookie']
      delete h['Cookie']
      delete h['authorization']
      delete h['Authorization']
    }
    if (event.request?.cookies) {
      event.request.cookies = {}
    }

    if (event.request?.data) {
      event.request.data = redact(event.request.data)
    }

    return event
  },
})
