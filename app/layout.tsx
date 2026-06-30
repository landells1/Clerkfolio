import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import PreferencesApplier from '@/components/accessibility/preferences-applier'
import CookieBanner from '@/components/legal/cookie-banner'
import AnalyticsGate from '@/components/legal/analytics-gate'

export const metadata: Metadata = {
  title: 'Clerkfolio - Medical Portfolio Tracker',
  description: 'The centralised portfolio tracker for UK medical students and foundation doctors. Log cases, achievements, and reflections. Export for any specialty application.',
  metadataBase: new URL('https://clerkfolio.co.uk'),
  alternates: {
    canonical: '/',
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon', type: 'image/png', sizes: '32x32' },
      { url: '/icon-192', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icon-192',
  },
  openGraph: {
    title: 'Clerkfolio',
    description: 'Your medical portfolio, organised.',
    url: 'https://clerkfolio.co.uk',
    siteName: 'Clerkfolio',
    locale: 'en_GB',
    type: 'website',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Clerkfolio',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html lang="en">
      <head>
        {/* No-flash theme init — runs before first paint. Cream is the default;
            dark is opt-in and stamped here from the stored choice so dark users
            never see a flash of cream (and vice versa). Keep this first in head. */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('cf-theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`,
          }}
        />
        <meta name="theme-color" content="#EDE6CE" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', function() { navigator.serviceWorker.register('/sw.js'); }); }`,
          }}
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <PreferencesApplier />
        <div id="main-content">{children}</div>
        <CookieBanner />
        <AnalyticsGate />
      </body>
    </html>
  )
}
