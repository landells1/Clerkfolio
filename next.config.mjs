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
  // The CJS file's dynamic `import('@react-pdf/renderer')` is a string that
  // Next.js's static file tracer cannot follow, so the package and its
  // transitive @react-pdf/* + yoga-layout + fontkit dependencies have to be
  // listed explicitly. Without these the deployed lambda renders
  // "Cannot find package '@react-pdf/renderer'" the moment a user clicks
  // Export PDF (Sentry CLERKFOLIO-1, 2026-05-16).
  outputFileTracingIncludes: {
    'app/api/export/**': [
      './lib/pdf/portfolio-pdf-runtime.cjs',
      './node_modules/@react-pdf/**',
      // Listed already; kept for the file-trace tool to pick up.
      './node_modules/yoga-layout/**',
      './node_modules/fontkit/**',
      './node_modules/restructure/**',
      './node_modules/unicode-properties/**',
      './node_modules/unicode-trie/**',
      './node_modules/dfa/**',
      './node_modules/tiny-inflate/**',
      './node_modules/clone/**',
      './node_modules/png-js/**',
      // Transitive deps the @react-pdf packages reach for at runtime.
      // Each @react-pdf/* package has its own dependencies block (see
      // node_modules/@react-pdf/font/package.json etc.) - these are the ones
      // missing from the deployed lambda, surfaced by Sentry CLERKFOLIO-2
      // ("Cannot find package 'is-url'") and the package.json scrape.
      './node_modules/is-url/**',
      './node_modules/bidi-js/**',
      './node_modules/emoji-regex-xs/**',
      './node_modules/hyphen/**',
      './node_modules/linebreak/**',
      './node_modules/queue/**',
      './node_modules/color-string/**',
      './node_modules/jay-peg/**',
      './node_modules/js-md5/**',
      './node_modules/hsl-to-hex/**',
      './node_modules/ast-types/**',
      './node_modules/recast/**',
      './node_modules/media-engine/**',
      './node_modules/object-assign/**',
      './node_modules/@babel/runtime/**',
      './node_modules/prop-types/**',
      './node_modules/vite-compatible-readable-stream/**',
      './node_modules/react-reconciler-23/**',
      './node_modules/react-reconciler-31/**',
      './node_modules/react-reconciler-33/**',
      './node_modules/@noble/ciphers/**',
      './node_modules/@noble/hashes/**',
      './node_modules/browserify-zlib/**',
      './node_modules/iconv-lite/**',
      // Second round, surfaced by debug-surface: @react-pdf/render needs the
      // SVG path-conversion utilities + postcss-value-parser for stylesheet.
      // Bundle each one explicitly so the trace tool packs them into the
      // lambda even though the dynamic import('@react-pdf/...') string blocks
      // automatic discovery.
      './node_modules/abs-svg-path/**',
      './node_modules/normalize-svg-path/**',
      './node_modules/parse-svg-path/**',
      './node_modules/svg-arc-to-cubic-bezier/**',
      './node_modules/postcss-value-parser/**',
      // Third round: fontkit's dist/module.mjs imports @swc/helpers (its
      // dependency for the compiled output's TypeScript class fields polyfills)
      // and brotli/fast-deep-equal at runtime.
      './node_modules/@swc/helpers/**',
      './node_modules/brotli/**',
      './node_modules/fast-deep-equal/**',
      // Defensive: pdfkit + textkit + reconciler often reach for these runtime
      // helpers; add them upfront so we don't need another round-trip per
      // missing module.
      './node_modules/buffer/**',
      './node_modules/process/**',
      './node_modules/path-browserify/**',
      './node_modules/inherits/**',
      './node_modules/safe-buffer/**',
      './node_modules/string_decoder/**',
      './node_modules/util-deprecate/**',
      './node_modules/readable-stream/**',
      './node_modules/tslib/**',
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
