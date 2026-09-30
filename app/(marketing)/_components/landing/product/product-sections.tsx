import type { ReactNode } from 'react'
import { LANDING_FAQS } from '@/lib/marketing/faqs'
import { MARKETING_PRICING_FEATURES, PRICING_TIERS } from '@/lib/marketing/pricing'
import { CheckIcon, DownloadIcon, FileIcon, LinkIcon, LockIcon, PlusIcon, SearchIcon, ShieldIcon } from './icons'
import { AppWindow, CaseFormPhone, CasesPhone, EntryDetailPage, ImportPage, PdfExportPage, Phone, ShareLinksPage, SpecialtyPage } from './mocks'
import { OpeningStatus } from './product-hero'
import { CONTAINER } from './shared'
import styles from './product.module.css'

const H2 = `${styles.display} text-[clamp(2.1rem,4vw,3.4rem)]`
// One step up the scale for the two statement moments of the page.
const H2_STATEMENT = `${styles.display} text-[clamp(2.4rem,5.2vw,4.4rem)]`
const LEAD = `${styles.prose} mt-5 max-w-[34rem] text-[18px] leading-[1.6] text-[var(--p-ink-2)]`

type Glyph = (props: { className?: string }) => ReactNode

function Points({ items }: { items: readonly (readonly [string, string, Glyph?])[] }) {
  return (
    <dl className="mt-9 space-y-6">
      {items.map(([title, body, Icon]) => (
        <div key={title} className="flex gap-4">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--p-primary-soft)] text-[var(--p-primary-text)]">
            {Icon ? <Icon className="h-[18px] w-[18px]" /> : <CheckIcon className="h-[18px] w-[18px]" />}
          </span>
          <div>
            <dt className="text-[17px] font-semibold tracking-[-0.01em]">{title}</dt>
            <dd className={`${styles.prose} mt-1 max-w-[30rem] text-[16px] leading-[1.55] text-[var(--p-ink-2)]`}>{body}</dd>
          </div>
        </div>
      ))}
    </dl>
  )
}

const benefits = [
  ['Keep one personal record', 'Bring achievements, reflections, evidence and anonymised cases together instead of rebuilding the same history for every move or application.'],
  ['Find useful evidence again', 'Search structured entries, use consistent tags and keep supporting files beside the work they evidence.'],
  ['Take it to the next stage', 'Export your records, prepare focused application packs or share selected portfolio evidence when you need it.'],
] as const

export function WhySection() {
  return (
    <section id="why" aria-labelledby="why-title" className="scroll-mt-20 py-24 sm:py-32">
      <div className={`${CONTAINER} grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20`}>
        <div>
          <h2 id="why-title" className={H2}>Your evidence should not disappear between systems.</h2>
          <p className={LEAD}>
            Cases, certificates, reflections and application evidence often end up across notes, inboxes, spreadsheets and official training systems. Clerkfolio gives you one personal record in which to organise them.
          </p>
          <Points items={benefits} />
        </div>
        <div className={styles.reveal}>
          <AppWindow label="Example of the Import your portfolio page with the Horus importer" path="import">
            <ImportPage />
          </AppWindow>
        </div>
      </div>
    </section>
  )
}

const tools = [
  ['Evidence beside the entry', 'Keep supporting files with the case, activity or achievement they relate to.', FileIcon],
  ['Search, timelines and imports', 'Find previous work, review your activity over time and bring supported records into one place.', SearchIcon],
  ['Exports and focused sharing', 'Create application PDFs, CSV, JSON or ZIP backups, and share selected portfolio evidence through a required-PIN link.', DownloadIcon],
] as const

export function FeatureSections() {
  return (
    <>
      <section id="portfolio" aria-labelledby="portfolio-title" className="scroll-mt-20 py-24 sm:py-32">
        <div className={`${CONTAINER} grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16`}>
          <div>
            <h2 id="portfolio-title" className={H2_STATEMENT}>One portfolio for everything you do.</h2>
            <p className={LEAD}>Keep audits, teaching, reflections, procedures, publications, leadership, conferences and prizes in one place. It stays with you through rotations, trusts and training stages.</p>
          </div>
          <div className={styles.reveal}>
            <AppWindow label="Example portfolio entry page with details, competency themes and evidence files" path="portfolio/entry">
              <EntryDetailPage />
            </AppWindow>
          </div>
        </div>
      </section>

      <section id="specialties" aria-labelledby="specialties-title" className="scroll-mt-20 bg-[var(--p-surface)] py-24 sm:py-32">
        <div className={`${CONTAINER} text-center`}>
          <h2 id="specialties-title" className={`${H2} mx-auto max-w-[20ch]`}>See your evidence alongside specialty criteria.</h2>
          <p className={`${LEAD} mx-auto`}>Link existing entries to published application domains and see where you have supporting evidence. You decide how it applies to your application.</p>
        </div>
        <div className={`${CONTAINER} mt-14`}>
          <div className={`${styles.reveal} mx-auto max-w-[1000px]`}>
            <AppWindow label="Example IMT 2026 specialty page with self-assessed score, scoring bands and linked evidence" path="specialties/imt-2026">
              <SpecialtyPage />
            </AppWindow>
          </div>
        </div>
      </section>

      <section id="cases" aria-labelledby="cases-title" className="scroll-mt-20 py-24 sm:py-32">
        <div className={`${CONTAINER} grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16`}>
          <div className={`${styles.fieldPanel} order-2 overflow-hidden rounded-3xl px-6 pt-12 sm:px-10 lg:order-1`}>
            <div className={`${styles.reveal} flex items-end justify-center gap-5`}>
              <Phone label="Example cases list on a phone" className="-mb-24 hidden sm:block">
                <CasesPhone />
              </Phone>
              <Phone label="Example of logging an anonymised case on a phone" className="-mb-10">
                <CaseFormPhone />
              </Phone>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 id="cases-title" className={`${styles.display} text-[clamp(2rem,3.6vw,3rem)]`}>Log cases while the details are fresh.</h2>
            <p className={LEAD}>Record anonymised cases with clinical area, learning and supporting evidence, from your phone or your desktop.</p>
          </div>
        </div>
      </section>

      <section id="tools" aria-labelledby="tools-title" className="scroll-mt-20 bg-[var(--p-surface)] py-24 sm:py-32">
        <div className={`${CONTAINER} grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16`}>
          <div className={`${styles.reveal} order-2 lg:order-1`}>
            <AppWindow label="Example Application PDF tab with format, template and selected entries" path="export/application-pdf">
              <PdfExportPage />
            </AppWindow>
          </div>
          <div className="order-1 lg:order-2">
            <h2 id="tools-title" className={`${styles.display} text-[clamp(2rem,3.6vw,3rem)]`}>Ready when an application opens.</h2>
            <Points items={tools} />
          </div>
        </div>
      </section>
    </>
  )
}

const reassurances = [
  ['Patient information', 'Do not enter names, dates of birth, NHS numbers or other patient-identifiable information.', ShieldIcon],
  ['Focused sharing', 'Portfolio share links require a PIN and an expiry date. Case entries are never included.', LinkIcon],
  ['Your records', 'Export your data when you need it and request account deletion when you are finished.', LockIcon],
] as const

export function PrivacySection() {
  return (
    <section id="privacy-and-control" aria-labelledby="privacy-title" className="scroll-mt-20 py-24 sm:py-32">
      <div className={`${CONTAINER} grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20`}>
        <div>
          <h2 id="privacy-title" className={H2}>Built for careful professional record-keeping.</h2>
          <p className={LEAD}>Clerkfolio helps you organise professional evidence without turning clinical records into shareable portfolio content.</p>
          <Points items={reassurances} />
          <p className={`${styles.prose} mt-10 max-w-[34rem] border-t border-[var(--p-line)] pt-6 text-[14.5px] leading-[1.6] text-[var(--p-ink-3)]`}>
            Clerkfolio is independent. It is not affiliated with the NHS, GMC or any Royal College, and it does not replace a portfolio required by your deanery or training programme.
          </p>
        </div>
        <div className={styles.reveal}>
          <AppWindow label="Example Share links tab: create a PIN-protected link with an expiry date" path="export?tab=share">
            <ShareLinksPage />
          </AppWindow>
        </div>
      </div>
    </section>
  )
}

export function PricingSection() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-20 bg-[var(--p-surface)] py-24 sm:py-32">
      <div className={`${CONTAINER} text-center`}>
        <h2 id="pricing-title" className={`${H2_STATEMENT} mx-auto max-w-[16ch]`}>Free to use. Upgrade to Pro when you need more.</h2>
        <p className={`${LEAD} mx-auto`}>No card needed to start. The free plan is fully usable on its own. Pro is {'£'}9.99 a year.</p>
      </div>
      <div className={`${CONTAINER} mt-14 grid grid-cols-1 gap-5 lg:grid-cols-3`}>
        {PRICING_TIERS.map(tier => {
          const pro = tier.highlight
          return (
            <article
              key={tier.name}
              className={`flex flex-col rounded-3xl p-7 sm:p-8 ${pro ? 'bg-[var(--p-ink)] text-[var(--p-ground)] shadow-[var(--p-shadow-frame)]' : 'border border-[var(--p-line)] bg-[var(--p-ground)] shadow-[var(--p-shadow-card)]'}`}
            >
              <h3 className="text-[20px] font-semibold">{tier.name}</h3>
              <p className="mt-4 text-[30px] font-semibold leading-tight tracking-[-0.025em]">{tier.marketingPrice}</p>
              <p className={`mt-2 text-[15px] ${pro ? 'text-[color-mix(in_srgb,var(--p-ground)_82%,var(--p-primary))]' : 'text-[var(--p-ink-2)]'}`}>{tier.marketingDescription}</p>
              <ul className={`mt-7 space-y-3 border-t pt-7 ${pro ? 'border-[color-mix(in_srgb,var(--p-ground)_18%,transparent)]' : 'border-[var(--p-line)]'}`}>
                {MARKETING_PRICING_FEATURES[tier.name].map(feature => (
                  <li key={feature} className="flex gap-3 text-[15px] leading-snug">
                    <CheckIcon className={`h-[18px] w-[18px] ${pro ? 'text-[var(--p-warm-soft)]' : 'text-[var(--p-warm-text)]'}`} />
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          )
        })}
      </div>
      <div className={`${CONTAINER} mt-10 flex flex-col items-center gap-4 text-center`}>
        <OpeningStatus />
        <p className={`${styles.prose} max-w-[34rem] text-[15px] leading-[1.6] text-[var(--p-ink-3)]`}>
          Working in the NHS? Verifying an nhs.net (or other NHS) email adds extra storage to the free Verified plan. ARCP capability tracking is included for eligible training stages - set yours during onboarding.
        </p>
      </div>
    </section>
  )
}

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 py-24 sm:py-32">
      <div className={`${CONTAINER} max-w-[860px]`}>
        <h2 id="faq-title" className={`${H2} text-center`}>Frequently asked questions.</h2>
        <div className="mt-12 divide-y divide-[var(--p-line)] border-y border-[var(--p-line)]">
          {LANDING_FAQS.map(([question, answer]) => (
            <details key={question} className="group">
              <summary className={`${styles.faqSummary} flex min-h-[68px] cursor-pointer list-none items-center justify-between gap-6 py-4 text-[17px] font-medium sm:text-[18px]`}>
                {question}
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--p-surface-2)]">
                  <PlusIcon className={`${styles.faqIcon} h-4 w-4`} />
                </span>
              </summary>
              <p className={`${styles.prose} max-w-[40rem] pb-6 text-[16px] leading-[1.65] text-[var(--p-ink-2)]`}>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
