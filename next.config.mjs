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
    // Wholesale ./node_modules/** blew the 250MB uncompressed lambda cap
    // (next/dist 133MB + @next/swc 137MB dominate). Enumerate the runtime
    // transitive closure of @react-pdf/renderer + react + react-dom + yoga
    // explicitly so the lambda stays small.
    'app/api/export/**': [
      './lib/pdf/portfolio-pdf-runtime.cjs',
      './node_modules/@babel/runtime/**',
      './node_modules/@noble/ciphers/**',
      './node_modules/@noble/hashes/**',
      './node_modules/@react-pdf/**',
      './node_modules/@swc/helpers/**',
      './node_modules/brotli/**',
      './node_modules/clone/**',
      './node_modules/dfa/**',
      './node_modules/fast-deep-equal/**',
      './node_modules/tiny-inflate/**',
      './node_modules/unicode-trie/**',
      './node_modules/abs-svg-path/**',
      './node_modules/bidi-js/**',
      './node_modules/browserify-zlib/**',
      './node_modules/color-string/**',
      './node_modules/emoji-regex-xs/**',
      './node_modules/events/**',
      './node_modules/fontkit/**',
      './node_modules/hsl-to-hex/**',
      './node_modules/hsl-to-rgb-for-reals/**',
      './node_modules/hyphen/**',
      './node_modules/inherits/**',
      './node_modules/is-url/**',
      './node_modules/jay-peg/**',
      './node_modules/js-md5/**',
      './node_modules/js-tokens/**',
      './node_modules/linebreak/**',
      './node_modules/loose-envify/**',
      './node_modules/media-engine/**',
      './node_modules/normalize-svg-path/**',
      './node_modules/object-assign/**',
      './node_modules/pako/**',
      './node_modules/parse-svg-path/**',
      './node_modules/png-js/**',
      './node_modules/postcss-value-parser/**',
      './node_modules/prop-types/**',
      './node_modules/queue/**',
      './node_modules/queue-microtask/**',
      './node_modules/react/**',
      './node_modules/react-dom/**',
      './node_modules/react-is/**',
      './node_modules/require-from-string/**',
      './node_modules/restructure/**',
      './node_modules/safe-buffer/**',
      './node_modules/scheduler/**',
      './node_modules/string_decoder/**',
      './node_modules/svg-arc-to-cubic-bezier/**',
      './node_modules/unicode-properties/**',
      './node_modules/util-deprecate/**',
      './node_modules/vite-compatible-readable-stream/**',
      './node_modules/yoga-layout/**',
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
