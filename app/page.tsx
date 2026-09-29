import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { JsonLd } from '@/components/seo/json-ld'
import { LANDING_FAQS } from '@/lib/marketing/faqs'
import { SITE_NAME, SITE_URL } from '@/lib/marketing/metadata'
import { PRICING_TIERS } from '@/lib/marketing/pricing'
import { archivo } from './(marketing)/_components/landing/rota/fonts'
import { HowSheet } from './(marketing)/_components/landing/rota/how-sheet'
import { RotaFooter } from './(marketing)/_components/landing/rota/rota-footer'
import { RotaNav } from './(marketing)/_components/landing/rota/rota-nav'
import {
  AudienceSheet,
  FaqSheet,
  FeaturesSheet,
  HeroSheet,
  PricingSheet,
  PrivacySheet,
  WhySheet,
} from './(marketing)/_components/landing/rota/rota-sections'
import rota from './(marketing)/_components/landing/rota/rota.module.css'
import { SheetTabs } from './(marketing)/_components/landing/rota/sheet-tabs'

const title = 'Clerkfolio | UK medical portfolio tracker for your whole career'
const description = 'The portfolio tracker for UK medical students and doctors: achievements, specialty application evidence and anonymised cases, in one place for your whole career.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/' },
  openGraph: {
    title,
    description,
    url: 'https://clerkfolio.co.uk',
    siteName: 'Clerkfolio',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
}

// Entity data for search engines and AI answer engines. Every claim here must
// match visible page content. Ratings and review data are intentionally absent.
function landingStructuredData() {
  const proTier = PRICING_TIERS.find(tier => tier.name === 'Pro')
  const organization = {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512`,
    email: 'admin@clerkfolio.co.uk',
    description: 'Clerkfolio is an independent UK medical portfolio tracker for medical students and doctors. It is not affiliated with the NHS, GMC, or any Royal College.',
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
    description: 'A medical portfolio tracker for UK medical students and doctors, with achievement tracking, supported specialty self-assessment mapping, anonymised case logging and data export.',
    offers: [
      { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'GBP' },
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
    <div className={`${archivo.variable} ${rota.root}`}>
      <JsonLd data={landingStructuredData()} nonce={nonce} />
      {wasDeleted ? (
        <div role="status" className="border-b border-[var(--r-grid)] bg-[var(--r-select-soft)] px-4 py-3 text-[15px] text-[var(--r-ink)] sm:px-6 lg:px-10">
          Your account has been permanently deleted. Sorry to see you go.
        </div>
      ) : null}
      <RotaNav />
      <main>
        <HeroSheet />
        <WhySheet />
        <HowSheet />
        <FeaturesSheet />
        <PrivacySheet />
        <AudienceSheet />
        <PricingSheet />
        <FaqSheet />
        <SheetTabs />
      </main>
      <RotaFooter />
    </div>
  )
}
