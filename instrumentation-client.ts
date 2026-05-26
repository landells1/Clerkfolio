import * as Sentry from '@sentry/nextjs'

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

const isProd = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT === 'production'
const isLandingPage = () => typeof window !== 'undefined' && window.location.pathname === '/'

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
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? 'development',

  tracesSampler: () => isLandingPage() ? 0 : isProd ? 0.1 : 1.0,

  // No session replay — medical app
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  sendDefaultPii: false,

  beforeSend(event) {
    const message = event.exception?.values?.[0]?.value ?? ''

    // Filter browser noise
    if (
      /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/.test(message) ||
      message.includes('Route Cancelled') ||
      message.includes('The user aborted a request') ||
      // Stripe redirect aborts
      (event.exception?.values?.[0]?.type === 'AbortError' && message.includes('Load failed'))
    ) {
      return null
    }

    // Strip cookies and auth headers
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

    // Redact sensitive fields in request body
    if (event.request?.data) {
      event.request.data = redact(event.request.data)
    }

    return event
  },
})
