import type { Metadata } from 'next'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  title: 'Clinidex - Medical Portfolio Tracker',
  description: 'The centralised portfolio tracker for UK medical students and foundation doctors. Log cases, achievements, and reflections. Export for any specialty application.',
  metadataBase: new URL('https://clinidex.co.uk'),
  manifest: '/manifest.json',
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
    title: 'Clinidex',
    description: 'Your medical portfolio, organised.',
    url: 'https://clinidex.co.uk',
    siteName: 'Clinidex',
    locale: 'en_GB',
    type: 'website',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Clinidex',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#1B6FD9" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', function() { navigator.serviceWorker.register('/sw.js'); }); }`,
          }}
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
