import type { Metadata } from 'next'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: 'Clinidex — Medical Portfolio Tracker',
  description: 'The centralised portfolio tracker for UK medical students and foundation doctors. Log cases, achievements, and reflections. Export for any specialty application.',
  metadataBase: new URL('https://clinidex.co.uk'),
  manifest: '/manifest.json',
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
        <SpeedInsights />
      </body>
    </html>
  )
}
