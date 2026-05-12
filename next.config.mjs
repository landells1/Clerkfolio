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
  // The export route loads lib/pdf/portfolio-pdf-runtime.cjs via createRequire
  // at runtime (path is built from process.cwd() so webpack can't see it).
  // Without this tracing include the .cjs file is left out of the deployed
  // lambda and the require fails with MODULE_NOT_FOUND. Next 15 expects the
  // key to look like a URL path - try a few likely candidates to be safe.
  outputFileTracingIncludes: {
    '/api/export': ['./lib/pdf/portfolio-pdf-runtime.cjs'],
    '/api/export/cv': ['./lib/pdf/portfolio-pdf-runtime.cjs'],
    '/api/export/year-review': ['./lib/pdf/portfolio-pdf-runtime.cjs'],
    'app/api/export/route.ts': ['./lib/pdf/portfolio-pdf-runtime.cjs'],
    'app/api/export/route': ['./lib/pdf/portfolio-pdf-runtime.cjs'],
    'app/api/export/**': ['./lib/pdf/portfolio-pdf-runtime.cjs'],
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

export default nextConfig;
