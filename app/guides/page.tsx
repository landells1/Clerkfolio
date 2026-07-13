import Link from 'next/link'
import { headers } from 'next/headers'
import { JsonLd } from '@/components/seo/json-ld'
import { marketingMetadata, SITE_URL } from '@/lib/marketing/metadata'
import { GUIDES, GUIDE_CLUSTERS } from '@/lib/guides'
import { CtaFooter } from '../(marketing)/_components/landing/cta-footer'
import { Nav } from '../(marketing)/_components/landing/nav'
import { formatGuideDate } from './format-date'

export const metadata = marketingMetadata({
  title: 'Guides for UK medical portfolios - Clerkfolio',
  description:
    'Practical, source-cited guides for UK medical students and doctors on building portfolio evidence: specialty training applications, IMT and CST portfolios, ARCP preparation, documenting teaching, audits and QIPs, and reflective practice.',
  path: '/guides',
})

function guidesStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE_URL}/guides` },
        ],
      },
      {
        '@type': 'CollectionPage',
        name: 'Clerkfolio guides',
        url: `${SITE_URL}/guides`,
        inLanguage: 'en-GB',
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: GUIDES.map((guide, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: guide.title,
            url: `${SITE_URL}/guides/${guide.slug}`,
          })),
        },
      },
    ],
  }
}

export default async function GuidesHubPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg-canvas)] text-ink">
      <JsonLd data={guidesStructuredData()} nonce={nonce} />
      <Nav />
      <main className="px-6 py-12 sm:py-16 md:px-14 lg:py-20">
        <header className="max-w-3xl">
          <h1 className="text-[clamp(34px,7vw,52px)] font-medium leading-[1.05] tracking-[-0.045em] text-ink">
            Guides for a portfolio that lasts your whole career.
          </h1>
          <p className="mt-5 max-w-[620px] text-base leading-[1.6] text-ink-soft sm:text-lg">
            Practical guidance for UK medical students and doctors on collecting and documenting
            portfolio evidence. Every requirement claim is checked against the official source it
            cites, and each guide shows the date its sources were last reviewed.
          </p>
        </header>

        {GUIDE_CLUSTERS.map(cluster => {
          const clusterGuides = GUIDES.filter(guide => guide.cluster === cluster.key)
          const pillar = clusterGuides.find(guide => guide.isPillar)
          const supporting = clusterGuides.filter(guide => !guide.isPillar)
          return (
            <section key={cluster.key} className="mt-14 max-w-5xl" aria-label={cluster.label}>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-emphasis)]">
                {cluster.label}
              </p>
              <p className="mb-5 max-w-[620px] text-sm leading-[1.6] text-ink-soft">{cluster.blurb}</p>
              {pillar ? (
                <Link
                  href={`/guides/${pillar.slug}`}
                  className="block max-w-3xl rounded-2xl border border-default bg-[var(--bg-surface)] p-6 transition hover:border-strong sm:p-8"
                >
                  <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">{pillar.title}</h2>
                  <p className="mt-3 text-[15px] leading-[1.65] text-ink-soft">{pillar.summary}</p>
                  <p className="mt-4 text-xs text-ink-dim">Last reviewed {formatGuideDate(pillar.lastReviewed)}</p>
                </Link>
              ) : null}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {supporting.map(guide => (
                  <Link
                    key={guide.slug}
                    href={`/guides/${guide.slug}`}
                    className="flex flex-col rounded-2xl border border-default bg-[var(--bg-surface)] p-5 transition hover:border-strong"
                  >
                    <h2 className="text-base font-semibold tracking-[-0.01em] text-ink">{guide.shortTitle}</h2>
                    <p className="mt-2 flex-1 text-sm leading-[1.6] text-ink-soft">{guide.summary}</p>
                    <p className="mt-4 text-xs text-ink-dim">Last reviewed {formatGuideDate(guide.lastReviewed)}</p>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}

        <p className="mt-16 max-w-3xl text-sm leading-6 text-ink-dim">
          Clerkfolio is independent and is not affiliated with the NHS, the GMC, the UKFPO, or any
          Royal College. These guides summarise officially published guidance and always link to
          the original source - check the current version of the official guidance and your own
          foundation school or deanery requirements before relying on any summary. Guides are
          written and maintained by Clerkfolio; they are general information, not advice about
          your individual training situation.
        </p>
      </main>
      <CtaFooter />
    </div>
  )
}
