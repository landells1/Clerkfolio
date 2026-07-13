import Link from 'next/link'
import { headers } from 'next/headers'
import { JsonLd } from '@/components/seo/json-ld'
import { LEGAL_ENTITY } from '@/lib/legal/entity'
import { marketingMetadata, SITE_URL } from '@/lib/marketing/metadata'
import { CtaFooter } from '../(marketing)/_components/landing/cta-footer'
import { Nav } from '../(marketing)/_components/landing/nav'

export const metadata = marketingMetadata({
  title: 'About - Clerkfolio',
  description: 'Clerkfolio is an independent medical portfolio app designed and built by doctors working in the NHS. Find out why it exists, the principles behind it, and how specialty data is kept accurate.',
  path: '/about',
})

// Keep this page strictly factual: no invented credentials, no institutional
// affiliation claims, no user counts or testimonials until they are real. The
// proprietor's name renders only once the owner fills lib/legal/entity.ts.
function aboutStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': `${SITE_URL}/about`,
        url: `${SITE_URL}/about`,
        name: 'About Clerkfolio',
        about: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'About', item: `${SITE_URL}/about` },
        ],
      },
    ],
  }
}

export default async function AboutPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg-canvas)] text-ink">
      <JsonLd data={aboutStructuredData()} nonce={nonce} />
      <Nav />
      <main className="px-6 py-12 sm:py-16 md:px-14 lg:py-20">
        <article className="max-w-3xl">
          <h1 className="text-[clamp(34px,7vw,52px)] font-medium leading-[1.05] tracking-[-0.045em] text-ink">
            Designed and built by doctors working in the NHS.
          </h1>

          <div className="mt-8 space-y-5 text-[15px] leading-[1.7] text-ink-soft">
            <p>
              Portfolio evidence can end up across photo libraries, email attachments, spreadsheets
              and several official systems. Finding and organising it again for each application
              takes longer than it should.
            </p>
            <p>
              Clerkfolio provides one personal record for clinical experience, supporting evidence
              and specialty application criteria. Keep relevant files with each entry, organise
              evidence around the criteria you need, and prepare an export when you are ready to
              apply.
            </p>
          </div>

          <h2 className="mt-12 text-2xl font-medium tracking-[-0.03em]">The principles it is built on</h2>
          <div className="mt-5 space-y-5 text-[15px] leading-[1.7] text-ink-soft">
            <p>
              <strong className="font-medium text-ink">No patient identifiers, by design.</strong>{' '}
              Case logging is anonymised. The forms remind you at every step, the terms require it,
              and nothing in the product ever asks for information that could identify a patient.
            </p>
            <p>
              <strong className="font-medium text-ink">You do the judging.</strong> Clerkfolio shows
              official criteria next to your evidence and lets you self-assess. It will never score
              your readiness, predict an outcome, or tell you whether you are good enough - that
              judgement belongs to you and the people who assess you.
            </p>
            <p>
              <strong className="font-medium text-ink">Your data is yours.</strong> Everything is
              exportable - PDF, Word, CSV, JSON, or a full ZIP backup - and stopping a subscription
              never deletes anything. UK-hosted (London), encrypted in transit and at rest. The
              detail is in the <Link href="/privacy" className="text-[var(--accent-text)] underline underline-offset-2">privacy policy</Link> and{' '}
              <Link href="/security" className="text-[var(--accent-text)] underline underline-offset-2">security policy</Link>.
            </p>
            <p>
              <strong className="font-medium text-ink">Independent, and clear about it.</strong>{' '}
              Clerkfolio is not affiliated with the NHS, the GMC, or any Royal College, and it does
              not replace the official portfolio your deanery requires (Horus, Turas, or a college
              ePortfolio). It is the personal layer that makes those official processes less
              painful.
            </p>
          </div>

          <h2 className="mt-12 text-2xl font-medium tracking-[-0.03em]">How specialty data stays accurate</h2>
          <div className="mt-5 space-y-5 text-[15px] leading-[1.7] text-ink-soft">
            <p>
              Every specialty configuration in Clerkfolio cites the official source it was built
              from - person specifications, self-assessment guidance and recruitment-office pages -
              together with the date it was last verified, shown in the app. Configurations are
              re-verified against those sources each recruitment cycle, and automated checks flag
              any that go stale. If something changes mid-cycle, always treat the official
              applicant guidance as authoritative and{' '}
              <Link href="/contact" className="text-[var(--accent-text)] underline underline-offset-2">tell us</Link> so
              we can fix it quickly.
            </p>
          </div>

          <h2 className="mt-12 text-2xl font-medium tracking-[-0.03em]">Get in touch</h2>
          <div className="mt-5 space-y-5 text-[15px] leading-[1.7] text-ink-soft">
            <p>
              Questions, corrections, feature requests or security reports all reach a person, not
              a ticket queue: <a href={`mailto:${LEGAL_ENTITY.contactEmail}`} className="text-[var(--accent-text)] underline underline-offset-2">{LEGAL_ENTITY.contactEmail}</a>,
              or the <Link href="/contact" className="text-[var(--accent-text)] underline underline-offset-2">contact page</Link>.
            </p>
          </div>
        </article>
      </main>
      <CtaFooter />
    </div>
  )
}
