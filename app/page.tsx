import type { Metadata } from 'next'
import { Audience } from './(marketing)/_components/landing/audience'
import { CtaFooter } from './(marketing)/_components/landing/cta-footer'
import { FAQ } from './(marketing)/_components/landing/faq'
import { Features } from './(marketing)/_components/landing/features'
import { Hero } from './(marketing)/_components/landing/hero'
import { HowItWorks } from './(marketing)/_components/landing/how-it-works'
import { Nav } from './(marketing)/_components/landing/nav'
import { Pricing } from './(marketing)/_components/landing/pricing'

export const metadata: Metadata = {
  title: 'Clerkfolio — The UK doctor portfolio that keeps up with your career',
  description: 'Log clinical cases, audits, teaching and reflections. Anonymised, indexed and exportable. Built around the actual evidence you need for ARCP, IMT, CST, GP and beyond.',
  openGraph: {
    title: 'Clerkfolio — The UK doctor portfolio that keeps up with your career',
    description: 'Log clinical cases, audits, teaching and reflections. Anonymised, indexed and exportable.',
    url: 'https://clerkfolio.co.uk',
    siteName: 'Clerkfolio',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Clerkfolio — The UK doctor portfolio that keeps up with your career',
    description: 'Anonymised, indexed and exportable portfolios for UK doctors and medical students.',
  },
}

export default function LandingPage({ searchParams }: { searchParams?: { deleted?: string } }) {
  const wasDeleted = searchParams?.deleted === 'true'

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0B0B0C] text-ink">
      {wasDeleted ? (
        <div className="border-b border-emerald-500/25 bg-emerald-500/10 px-6 py-3 text-sm text-accent md:px-14">
          Your account has been permanently deleted. Sorry to see you go.
        </div>
      ) : null}
      <Nav />
      <Hero />
      <Features />
      <Audience />
      <HowItWorks />
      <Pricing />
      <FAQ />
      <CtaFooter />
    </div>
  )
}
