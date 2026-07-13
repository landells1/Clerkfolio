import Link from 'next/link'
import { headers } from 'next/headers'
import { JsonLd } from '@/components/seo/json-ld'
import { marketingMetadata, SITE_URL } from '@/lib/marketing/metadata'
import { SPECIALTY_CONFIGS } from '@/lib/specialties'
import { CtaFooter } from '../(marketing)/_components/landing/cta-footer'
import { Nav } from '../(marketing)/_components/landing/nav'
import { SectionHeader } from '../(marketing)/_components/landing/section-header'

export const metadata = marketingMetadata({
  title: 'Features - Clerkfolio, the UK medical portfolio app',
  description: 'A career-long portfolio with achievement tracking, specialty self-assessment mapping, anonymised case logging, ARCP evidence, supervisor share links, and full PDF, Word, CSV and JSON export.',
  path: '/features',
})

// Ordered by importance (owner positioning, 2026-07-13): career-long
// portfolio first, then getting into training, then case logging.
const featureSections: { id: string; title: string; paragraphs: string[]; bullets?: string[]; linkText?: string; linkHref?: string }[] = [
  {
    id: 'portfolio',
    title: 'Keep your portfolio with you',
    paragraphs: [
      'Keep audits and QIPs, teaching sessions, reflections, procedures, publications, leadership roles, conference presentations and prizes in one place. Each category has the fields you need to record that work.',
      'Your Clerkfolio portfolio belongs to you. Move hospital, deanery, specialty or career stage and keep the same record.',
      'Attach evidence files (PDF, Word, PowerPoint, images and more) to any entry, and link one file to several entries without uploading it twice or counting it twice against your storage.',
    ],
  },
  {
    id: 'specialties',
    title: 'Specialty self-assessment mapping',
    paragraphs: [
      'Track a specialty application and link your entries to its published self-assessment domains. Clerkfolio shows the official criteria alongside your evidence. You decide how it applies to your application.',
      'Every specialty configuration cites its official sources with the date we last verified them, and covers the 2026 entry-level (ST1/CT1) application round for:',
    ],
    bullets: SPECIALTY_CONFIGS.map(config => config.name),
    linkText: 'New to specialty recruitment? Read our source-cited guide to how UK selection works.',
    linkHref: '/guides/specialty-training-applications',
  },
  {
    id: 'cases',
    title: 'Anonymised case logging',
    paragraphs: [
      'Log a clinical case from your phone or laptop. Every case form reminds you to leave out patient identifiers - no names, dates of birth or NHS numbers - so your case diary remains an anonymised record of your clinical experience.',
      'Cases can include a clinical area, specialty tags, competency themes, notes and an importance rating. Drafts save automatically while you type.',
    ],
  },
  {
    id: 'arcp',
    title: 'ARCP capability tracking',
    paragraphs: [
      'Foundation doctors, and doctors keeping foundation capabilities current after F2, can link portfolio evidence to ARCP capabilities and see what is already linked. It can help when preparing for the official deanery portfolio review. Clerkfolio complements Horus and Turas; it does not replace the portfolio your deanery requires.',
    ],
    linkText: 'New to the process? Read our source-cited ARCP preparation guide.',
    linkHref: '/guides/arcp-preparation',
  },
  {
    id: 'sharing',
    title: 'Share selected portfolio evidence',
    paragraphs: [
      'Create a read-only link for a specialty, a competency theme or your full portfolio of entries. Cases are never shared. Every link needs a PIN, can expire within 90 days and can be revoked at any time. The recipient does not need a Clerkfolio account.',
    ],
  },
  {
    id: 'export',
    title: 'Import and export your records',
    paragraphs: [
      'Bring an existing portfolio across with Horus CSV bulk import on Pro, or use CSV and JSON import. Export application PDFs, a CV in PDF or Word, CSV and JSON records, or a full ZIP backup whenever you need one.',
    ],
  },
  {
    id: 'security',
    title: 'Built for medical data hygiene',
    paragraphs: [
      'UK-hosted in London, encrypted in transit and at rest, GDPR-aligned, with no patient-identifiable data by design. Uploads are verified before they are stored, share links are rate-limited and audited, and deleting your account removes your data from live systems immediately.',
    ],
  },
]

function featuresStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Features', item: `${SITE_URL}/features` },
        ],
      },
    ],
  }
}

export default async function FeaturesPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg-canvas)] text-ink">
      <JsonLd data={featuresStructuredData()} nonce={nonce} />
      <Nav />
      <main className="px-6 py-12 sm:py-16 md:px-14 lg:py-20">
        <header className="max-w-3xl">
          <h1 className="text-[clamp(34px,7vw,52px)] font-medium leading-[1.05] tracking-[-0.045em] text-ink">
            A personal portfolio for medical school, foundation training and beyond.
          </h1>
          <p className="mt-5 max-w-[620px] text-base leading-[1.6] text-ink-soft sm:text-lg">
            Keep your achievements, specialty application evidence and anonymised case logs in one
            place. Clerkfolio also supports ARCP evidence, protected sharing and exports when you
            need them. The core tools are free to use. See{' '}
            <Link href="/pricing" className="text-[var(--accent-text)] underline underline-offset-2">pricing</Link> for
            what Pro adds.
          </p>
        </header>

        <div className="mt-14 space-y-14 sm:mt-20 sm:space-y-20">
          {featureSections.map((section, index) => (
            <section key={section.id} id={section.id} className="max-w-3xl">
              <SectionHeader label={`0${index + 1}`} title={section.title} />
              {section.paragraphs.map(paragraph => (
                <p key={paragraph.slice(0, 32)} className="mt-4 text-[15px] leading-[1.65] text-ink-soft">
                  {paragraph}
                </p>
              ))}
              {section.bullets ? (
                <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
                  {section.bullets.map(bullet => (
                    <li key={bullet} className="text-sm leading-6 text-ink-soft">
                      <span className="mr-2 text-accent" aria-hidden>→</span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
              {section.linkText && section.linkHref ? (
                <p className="mt-4 text-[15px] leading-[1.65] text-ink-soft">
                  <Link href={section.linkHref} className="text-[var(--accent-text)] underline underline-offset-2">
                    {section.linkText}
                  </Link>
                </p>
              ) : null}
            </section>
          ))}
        </div>

        <p className="mt-16 max-w-3xl text-sm leading-6 text-ink-dim">
          Clerkfolio is independent and is not affiliated with the NHS, the GMC, or any Royal
          College. Specialty criteria summarise officially published self-assessment guidance -
          always check the current applicant guidance for your specialty before submitting. Read
          more about <Link href="/about" className="underline underline-offset-2">who builds Clerkfolio</Link> and
          our <Link href="/security" className="underline underline-offset-2">security policy</Link>.
        </p>
      </main>
      <CtaFooter />
    </div>
  )
}
