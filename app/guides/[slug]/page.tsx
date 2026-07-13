import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/seo/json-ld'
import { marketingMetadata, SITE_URL, SITE_NAME } from '@/lib/marketing/metadata'
import { GUIDES, getGuide, relatedGuides, type Guide, type GuideBlock } from '@/lib/guides'
import { CtaFooter } from '../../(marketing)/_components/landing/cta-footer'
import { Nav } from '../../(marketing)/_components/landing/nav'
import { formatGuideDate } from '../format-date'

export function generateStaticParams() {
  return GUIDES.map(guide => ({ slug: guide.slug }))
}

export const dynamicParams = false

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const guide = getGuide(slug)
  if (!guide) return {}
  return marketingMetadata({
    title: guide.metaTitle,
    description: guide.metaDescription,
    path: `/guides/${guide.slug}`,
  })
}

// Article + BreadcrumbList derived from the same Guide object the page
// renders, so structured data always matches visible content. Author and
// publisher are the organisation - no personal bylines by policy.
function guideStructuredData(guide: Guide) {
  const url = `${SITE_URL}/guides/${guide.slug}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: guide.title,
        description: guide.metaDescription,
        url,
        mainEntityOfPage: url,
        datePublished: guide.published,
        dateModified: guide.lastReviewed,
        inLanguage: 'en-GB',
        author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_URL,
          logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512` },
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE_URL}/guides` },
          { '@type': 'ListItem', position: 3, name: guide.shortTitle, item: url },
        ],
      },
    ],
  }
}

function GuideBlockView({ block }: { block: GuideBlock }) {
  switch (block.kind) {
    case 'heading':
      return (
        <h2 id={block.id} className="mt-12 scroll-mt-24 text-2xl font-semibold tracking-[-0.02em] text-ink">
          {block.text}
        </h2>
      )
    case 'subheading':
      return <h3 className="mt-8 text-lg font-semibold tracking-[-0.01em] text-ink">{block.text}</h3>
    case 'paragraph':
      return <p className="mt-4 text-[15px] leading-[1.7] text-ink-soft">{block.text}</p>
    case 'bullets':
      return (
        <ul className="mt-4 space-y-2 pl-1">
          {block.items.map(item => (
            <li key={item.slice(0, 48)} className="flex gap-2.5 text-[15px] leading-[1.65] text-ink-soft">
              <span className="mt-[2px] shrink-0 text-accent" aria-hidden>→</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    case 'numbered':
      return (
        <ol className="mt-4 list-decimal space-y-2 pl-6">
          {block.items.map(item => (
            <li key={item.slice(0, 48)} className="text-[15px] leading-[1.65] text-ink-soft">
              {item}
            </li>
          ))}
        </ol>
      )
    case 'official':
      return (
        <div className="mt-6 rounded-2xl border border-default bg-[var(--bg-surface)] p-5 sm:p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-emphasis)]">
            Official requirements
          </p>
          <p className="mt-2 text-sm font-semibold text-ink">{block.title}</p>
          <ul className="mt-3 space-y-2">
            {block.items.map(item => (
              <li key={item.slice(0, 48)} className="flex gap-2.5 text-sm leading-[1.65] text-ink-soft">
                <span className="mt-[2px] shrink-0 text-accent" aria-hidden>→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )
    case 'guideList':
      return (
        <ul className="mt-4 space-y-2 pl-1">
          {block.items.map(item => (
            <li key={item.slug} className="flex gap-2.5 text-[15px] leading-[1.65] text-ink-soft">
              <span className="mt-[2px] shrink-0 text-accent" aria-hidden>→</span>
              <span>
                {item.text}
                {' - '}
                <Link href={`/guides/${item.slug}`} className="text-[var(--accent-text)] underline underline-offset-2">
                  read the guide
                </Link>
                .
              </span>
            </li>
          ))}
        </ul>
      )
    case 'tip':
      return (
        <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/5 p-5 sm:p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">Clerkfolio suggestion</p>
          <p className="mt-2 text-sm font-semibold text-ink">{block.title}</p>
          <p className="mt-2 text-sm leading-[1.65] text-ink-soft">{block.text}</p>
        </div>
      )
  }
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guide = getGuide(slug)
  if (!guide) notFound()

  const nonce = (await headers()).get('x-nonce') ?? undefined
  const related = relatedGuides(guide)

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg-canvas)] text-ink">
      <JsonLd data={guideStructuredData(guide)} nonce={nonce} />
      <Nav />
      <main className="px-6 py-12 sm:py-16 md:px-14 lg:py-20">
        <article className="mx-auto max-w-3xl">
          <nav aria-label="Breadcrumb" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-dim">
            <Link href="/" className="hover:text-ink">Home</Link>
            <span aria-hidden className="mx-2">/</span>
            <Link href="/guides" className="hover:text-ink">Guides</Link>
            <span aria-hidden className="mx-2">/</span>
            <span className="text-[var(--text-emphasis)]">{guide.shortTitle}</span>
          </nav>

          <header className="mt-6">
            <h1 className="text-[clamp(30px,5.5vw,44px)] font-medium leading-[1.08] tracking-[-0.035em] text-ink">
              {guide.title}
            </h1>
            <p className="mt-5 text-base leading-[1.65] text-ink-soft sm:text-lg">{guide.summary}</p>
            <p className="mt-5 text-sm text-ink-dim">
              Last reviewed <time dateTime={guide.lastReviewed}>{formatGuideDate(guide.lastReviewed)}</time> - requirement
              claims in this guide were checked against the cited official sources on that date. Published by Clerkfolio.
            </p>
          </header>

          {guide.blocks.map((block, index) => (
            <GuideBlockView key={`${block.kind}-${index}`} block={block} />
          ))}

          <section className="mt-12 rounded-2xl border border-default bg-[var(--bg-surface)] p-5 sm:p-6" aria-label="Sources">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-emphasis)]">
              Sources and jurisdiction
            </h2>
            <ul className="mt-3 space-y-2.5">
              {guide.sources.map(source => (
                <li key={source.url} className="text-sm leading-[1.6] text-ink-soft">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-text)] underline underline-offset-2"
                  >
                    {source.label}
                  </a>
                  <span className="text-ink-dim"> ({source.jurisdiction})</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-[1.6] text-ink-dim">
              Clerkfolio is independent and is not affiliated with the NHS, the GMC, the UKFPO, or any Royal College.
              This guide is general information, not advice about your individual training situation - always check the
              current official guidance and your own foundation school or deanery requirements.
            </p>
          </section>

          <section className="mt-10" aria-label="About Clerkfolio">
            <div className="rounded-2xl border border-default bg-[var(--bg-surface)] p-5 sm:p-6">
              <h2 className="text-base font-semibold text-ink">One portfolio for your entire career</h2>
              <p className="mt-2 text-sm leading-[1.65] text-ink-soft">
                Clerkfolio is a portfolio app for UK medical students and doctors. Log achievements, teaching, audits
                and reflections once, keep the evidence when you change trust, deanery or nation, and map the same
                entries to specialty applications and ARCP capabilities when you need them. See{' '}
                <Link href="/features" className="text-[var(--accent-text)] underline underline-offset-2">features</Link>{' '}
                and{' '}
                <Link href="/pricing" className="text-[var(--accent-text)] underline underline-offset-2">pricing</Link>.
              </p>
            </div>
          </section>

          {related.length > 0 ? (
            <section className="mt-10" aria-label="Related guides">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-emphasis)]">
                Related guides
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {related.map(item => (
                  <Link
                    key={item.slug}
                    href={`/guides/${item.slug}`}
                    className="rounded-xl border border-default bg-[var(--bg-surface)] p-4 transition hover:border-strong"
                  >
                    <p className="text-sm font-semibold text-ink">{item.shortTitle}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-[1.6] text-ink-soft">{item.summary}</p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </article>
      </main>
      <CtaFooter />
    </div>
  )
}
