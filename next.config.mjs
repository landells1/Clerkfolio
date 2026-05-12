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
