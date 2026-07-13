import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { JsonLd } from '@/components/seo/json-ld'
import { LANDING_FAQS } from '@/lib/marketing/faqs'
import { SITE_NAME, SITE_URL } from '@/lib/marketing/metadata'
import { PRICING_TIERS } from '@/lib/marketing/pricing'
import { Audience } from './(marketing)/_components/landing/audience'
import { CtaFooter } from './(marketing)/_components/landing/cta-footer'
import { FAQ } from './(marketing)/_components/landing/faq'
import { Features } from './(marketing)/_components/landing/features'
import { Hero } from './(marketing)/_components/landing/hero'
import { HowItWorks } from './(marketing)/_components/landing/how-it-works'
import { Nav } from './(marketing)/_components/landing/nav'
import { Pricing } from './(marketing)/_components/landing/pricing'

export const metadata: Metadata = {
  title: 'Clerkfolio - The UK doctor portfolio that keeps up with your career',
  description: 'Log clinical cases, audits, teaching and reflections. Anonymised, searchable and exportable, organised around the evidence you need for ARCP, IMT, CST, GP and beyond.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Clerkfolio - The UK doctor portfolio that keeps up with your career',
    description: 'Log clinical cases, audits, teaching and reflections. Anonymised, searchable and exportable.',
    url: 'https://clerkfolio.co.uk',
    siteName: 'Clerkfolio',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Clerkfolio - The UK doctor portfolio that keeps up with your career',
    description: 'Anonymised, searchable and exportable portfolios for UK doctors and medical students.',
  },
}

// Entity data for search engines and AI answer engines. Every claim here must
// match visible page content — no ratings, no fabricated review data.
function landingStructuredData() {
  const proTier = PRICING_TIERS.find(tier => tier.name === 'Pro')
  const organization = {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512`,
    email: 'admin@clerkfolio.co.uk',
    description: 'Clerkfolio is an independent UK portfolio app for medical students and doctors. It is not affiliated with the NHS, GMC, or any Royal College.',
  }
  const webSite = {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en-GB',
  }
  const softwareApplication = {
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/#app`,
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'A portfolio tracker for UK medical students and doctors: anonymised case logging, portfolio entries, specialty self-assessment mapping, ARCP evidence organisation, and PDF/CSV/JSON export.',
    offers: [
      {
        '@type': 'Offer',
        name: 'Free',
        price: '0',
        priceCurrency: 'GBP',
      },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '9.99',
        priceCurrency: 'GBP',
        description: proTier ? `${proTier.marketingPrice}. ${proTier.description}` : 'Annual subscription.',
      },
    ],
    publisher: { '@id': `${SITE_URL}/#organization` },
  }
  const faqPage = {
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/#faq`,
    mainEntity: LANDING_FAQS.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }
  return {
    '@context': 'https://schema.org',
    '@graph': [organization, webSite, softwareApplication, faqPage],
  }
}

export default async function LandingPage({ searchParams }: { searchParams?: Promise<{ deleted?: string }> }) {
  const resolvedSearchParams = await searchParams
  const wasDeleted = resolvedSearchParams?.deleted === 'true'
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg-canvas)] text-ink">
      <JsonLd data={landingStructuredData()} nonce={nonce} />
      {wasDeleted ? (
        <div className="border-b border-emerald-500/25 bg-emerald-500/10 px-6 py-3 text-sm text-[var(--success)] md:px-14">
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
