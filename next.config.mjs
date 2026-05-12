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
    // The .cjs runtime is loaded dynamically (Module._compile + fs.readFile),
    // so Next's tracer never sees its require() calls. It ships .next/server
    // chunks with React inlined but never lands node_modules/react itself in
    // /var/task. Pin the .cjs and every node_modules folder it needs so the
    // delegated require at runtime can resolve them.
    'app/api/export/**': [
      './lib/pdf/portfolio-pdf-runtime.cjs',
      // @react-pdf/renderer pulls in a long transitive tail (is-url,
      // emoji-regex, color, linebreak, @babel/runtime, …). Listing each by
      // hand has churned for several deploys; sweep node_modules wholesale
      // and tighten later if cold-start or 50MB lambda cap bites.
      './node_modules/**',
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

export default nextConfig;
