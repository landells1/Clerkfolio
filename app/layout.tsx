import type { Metadata } from 'next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  title: 'Clinidex — Medical Portfolio Tracker',
  description: 'The centralised portfolio tracker for UK medical students and foundation doctors. Log cases, achievements, and reflections. Export for any specialty application.',
  metadataBase: new URL('https://clinidex.co.uk'),
  openGraph: {
    title: 'Clinidex',
    description: 'Your medical portfolio, organised.',
    url: 'https://clinidex.co.uk',
    siteName: 'Clinidex',
    locale: 'en_GB',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}
