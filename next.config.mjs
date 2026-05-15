import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const appUrl = process.env.NEXT_PUBLIC_APP_URL
const appHost = appUrl ? new URL(appUrl).host : null
const vercelHost = process.env.VERCEL_URL ?? null

const nextConfig = {
  // Keep @react-pdf out of Next.js's React 19 vendoring. Next 15 routes use a
  // vendored React 19 that creates elements with $$typeof =
  // Symbol.for("react.transitional.element"), but @react-pdf/reconciler only
  // recognises the React 18 Symbol.for("react.element"). Without this externals
  // pin, every PDF render bails with "Minified React error #31; objects are
  // not valid as a React child".
  serverExternalPackages: [
    '@react-pdf/renderer',
    '@react-pdf/reconciler',
    '@react-pdf/layout',
    '@react-pdf/pdfkit',
    '@react-pdf/textkit',
    'yoga-layout',
  ],
  // The export routes load lib/pdf/portfolio-pdf-runtime.cjs via _compile at
  // runtime (path is built from process.cwd() so webpack can't see it).
  // Without this tracing include the .cjs file is left out of the deployed
  // lambda and the require fails with MODULE_NOT_FOUND.
  //
  // The CJS file's only external dependencies are react and @react-pdf/renderer,
  // both listed in serverExternalPackages above. Next.js file tracing already
  // traces and ships those packages automatically — no node_modules wildcard
  // needed. The previous wholesale ./node_modules/** include was what pushed the
  // lambda past the 250 MB limit.
  outputFileTracingIncludes: {
    'app/api/export/**': [
      './lib/pdf/portfolio-pdf-runtime.cjs',
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins:
        process.env.NODE_ENV === 'development'
          ? ['localhost:3000', '127.0.0.1:3000']
          : ['clerkfolio.co.uk', 'www.clerkfolio.co.uk', appHost, vercelHost].filter(Boolean),
    },
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Upload source maps in CI only
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Hide source maps from the deployed bundle
  hideSourceMaps: true,
  webpack: {
    // Drop Sentry debug logging from the production bundle
    treeshake: { removeDebugLogging: true },
    // Cron monitors are wired manually via Sentry.withMonitor — disable auto-wrap
    automaticVercelMonitors: false,
  },
})
