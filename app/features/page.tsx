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
    title: 'A portfolio for your entire career',
    paragraphs: [
      'Audits and QIPs, teaching sessions, reflections, procedures, publications, leadership roles, conference presentations and prizes - eight entry categories, each with the fields that actually matter for that kind of evidence.',
      'Unlike a trust or deanery system, your Clerkfolio portfolio belongs to you. Change hospital, deanery, specialty or career stage and everything comes with you - nothing gets left behind in an account you can no longer access.',
      'Attach evidence files (PDF, Word, PowerPoint, images and more) to any entry, and link one file to several entries without uploading it twice or counting it twice against your storage.',
    ],
  },
  {
    id: 'specialties',
    title: 'Specialty self-assessment mapping',
    paragraphs: [
      'Track a specialty application and map your entries onto its published self-assessment domains. You score yourself - Clerkfolio shows you the official criteria, where your evidence sits against them, and which domains still have nothing linked. No predictions, no verdicts: your judgement, better organised.',
      'Every specialty configuration cites its official sources with the date we last verified them, and covers the 2026 entry-level (ST1/CT1) application round for:',
    ],
    bullets: SPECIALTY_CONFIGS.map(config => config.name),
  },
  {
    id: 'cases',
    title: 'Anonymised case logging',
    paragraphs: [
      'Log a clinical case in under a minute, from a phone between patients or a laptop at the end of the day. Every case form reminds you to leave out patient identifiers - no names, dates of birth or NHS numbers - so your case diary stays a personal, anonymised record of your clinical experience.',
      'Cases carry a clinical area, specialty tags, competency themes, notes and an importance rating. Drafts auto-save while you type, so a bleep mid-entry loses nothing.',
    ],
  },
  {
    id: 'arcp',
    title: 'ARCP capability tracking',
    paragraphs: [
      'Foundation doctors (and doctors keeping foundation capabilities current after F2) can link portfolio evidence to ARCP capabilities and see coverage at a glance - useful preparation before the official deanery portfolio review. Clerkfolio complements Horus and Turas; it does not replace the portfolio your deanery requires.',
    ],
    linkText: 'New to the process? Read our source-cited ARCP preparation guide.',
    linkHref: '/guides/arcp-preparation',
  },
  {
    id: 'sharing',
    title: 'Share links your supervisor can actually open',
    paragraphs: [
      'Generate a read-only link scoped to a specialty, a competency theme, or your whole portfolio (entries only - anonymised cases are never shared). Every link is PIN-protected, expires when you say (up to 90 days), can be revoked instantly, and every view is audited. No supervisor account needed.',
    ],
  },
  {
    id: 'export',
    title: 'Import and export without lock-in',
    paragraphs: [
      'Bring an existing portfolio across with Horus CSV bulk import (Pro), or CSV/JSON import. Get everything out whenever you want: application-ready PDF packs, a formatted CV as PDF or Word, CSV and JSON for your own records, and a full ZIP backup of your account on demand. Your evidence is yours.',
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
            Everything a UK medical portfolio needs, in one place.
          </h1>
          <p className="mt-5 max-w-[620px] text-base leading-[1.6] text-ink-soft sm:text-lg">
            Clerkfolio is a career-long portfolio app for UK medical students and doctors: one
            portfolio for every achievement, specialty self-assessment mapping for training
            applications, anonymised case logging, ARCP evidence, supervisor sharing, and exports
            for every application. Free to
            use - see <Link href="/pricing" className="text-[var(--accent-text)] underline underline-offset-2">pricing</Link> for
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
