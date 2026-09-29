import type { ReactNode } from 'react'
import { VERIFIED_STORAGE_MB, formatStorageQuota } from '@/lib/entitlements/limits'
import { LANDING_FAQS } from '@/lib/marketing/faqs'
import { MARKETING_EVENTS } from '@/lib/marketing/analytics-events'
import { PRICING_FEATURES, PRICING_TIERS } from '@/lib/marketing/pricing'
import { TrackedLink } from '../tracked-link'
import { CATEGORIES } from './career-data'
import { CareerSheet } from './career-sheet'
import { ArrowIcon, CheckIcon, ClockIcon, DashIcon, LockIcon, PlusIcon } from './icons'
import styles from './rota.module.css'

const GUTTER = 'px-4 sm:px-6 lg:px-10'
const fill = (key: (typeof CATEGORIES)[number]['key']) => CATEGORIES.find(category => category.key === key)!

function SheetHeading({ id, children, sub, tone = 'ink' }: { id: string; children: ReactNode; sub?: string; tone?: 'ink' | 'band' }) {
  return (
    <div className={`${GUTTER} pb-10 pt-20 sm:pt-24 lg:pb-12 lg:pt-28`}>
      <h2 id={id} className={`${styles.display} max-w-[22ch] text-[clamp(2.4rem,5.2vw,4.25rem)]`}>
        {children}
      </h2>
      {sub ? (
        <p className={`${styles.prose} mt-5 max-w-[56ch] text-[17px] leading-[1.6] sm:text-[19px] ${tone === 'band' ? 'text-[var(--r-band-ink-2)]' : 'text-[var(--r-ink-2)]'}`}>
          {sub}
        </p>
      ) : null}
    </div>
  )
}

export function OpeningStatus({ className = '' }: { className?: string }) {
  return (
    <p className={`${styles.selected} inline-flex min-h-12 items-center gap-2.5 bg-[var(--r-select-soft)] px-5 text-[15px] font-semibold text-[var(--r-ink)] ${className}`}>
      <ClockIcon className="text-[var(--r-select)]" />
      Public sign-ups opening soon
    </p>
  )
}

export function HeroSheet() {
  return (
    <section id="top" aria-labelledby="hero-title" className="scroll-mt-16">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className={`${GUTTER} pb-8 pt-12 sm:pt-16 xl:border-r xl:border-[var(--r-grid)] xl:pb-12 xl:pt-16`}>
          <h1 id="hero-title" className={`${styles.display} max-w-[14ch] text-[clamp(3.1rem,9vw,6rem)] sm:max-w-none`}>
            One medical portfolio for your whole career.
          </h1>
        </div>
        <div className={`${GUTTER} flex flex-col justify-end gap-6 border-t border-[var(--r-grid)] py-7 xl:border-t-0 xl:pb-12`}>
          <p className={`${styles.prose} max-w-[56ch] text-[17px] leading-[1.6] text-[var(--r-ink-2)] sm:text-[19px]`}>
            Keep your achievements, specialty application evidence and anonymised case logs together. Clerkfolio stays with you when you move trust, hospital or training stage.
          </p>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-7">
          <OpeningStatus />
          <TrackedLink
            href="#how"
            analyticsEvent={MARKETING_EVENTS.cta}
            analyticsProperties={{ location: 'hero', action: 'see_how_it_works' }}
            className="inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-[var(--r-ink)] underline decoration-[var(--r-grid-strong)] hover:text-[var(--r-select)] hover:decoration-[var(--r-select)]"
          >
            See how Clerkfolio works
            <ArrowIcon />
          </TrackedLink>
          </div>
        </div>
      </div>
      <CareerSheet />
      <ul className="grid grid-cols-1 border-b border-[var(--r-grid)] bg-[var(--r-header)] text-[13px] text-[var(--r-ink-2)] sm:flex">
        {['Example record', 'Hosted in London, UK', 'Encrypted in transit and at rest', 'Export your records any time'].map((item, index) => (
          <li key={item} className={`border-[var(--r-grid)] px-4 py-2.5 sm:border-r sm:px-6 [&:not(:last-child)]:border-b sm:[&:not(:last-child)]:border-b-0 ${index === 0 ? 'font-semibold text-[var(--r-ink)]' : ''}`}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}

const sources = ['Notes app', 'Email inbox', 'Spreadsheets', 'Official training systems'] as const

const benefits = [
  ['Keep one personal record', 'Bring achievements, reflections, evidence and anonymised cases together instead of rebuilding the same history for every move or application.'],
  ['Find useful evidence again', 'Search structured entries, use consistent tags and keep supporting files beside the work they evidence.'],
  ['Take it to the next stage', 'Export your records, prepare focused application packs or share selected portfolio evidence when you need it.'],
] as const

export function WhySheet() {
  return (
    <section id="why" aria-labelledby="why-title" className="scroll-mt-16 border-t-2 border-[var(--r-ink)]">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="lg:border-r lg:border-[var(--r-grid)]">
          <SheetHeading
            id="why-title"
            sub="Cases, certificates, reflections and application evidence often end up across notes, inboxes, spreadsheets and official training systems. Clerkfolio gives you one personal record in which to organise them."
          >
            Your evidence should not disappear between systems.
          </SheetHeading>
        </div>
        <div className="flex flex-col border-t border-[var(--r-grid)] lg:border-t-0">
          <div className="grid flex-1 grid-cols-2 auto-rows-fr">
            {sources.map(source => (
              <p key={source} className={`${styles.cell} flex min-h-[88px] items-center bg-[var(--r-header)] px-4 text-[15px] text-[var(--r-ink-3)] sm:px-6`}>
                {source}
              </p>
            ))}
          </div>
          <p className={`${styles.selected} flex min-h-[96px] items-center gap-3 bg-[var(--r-ground)] px-4 text-[17px] font-semibold sm:px-6`}>
            <ArrowIcon className="rotate-90" />
            One personal record, in Clerkfolio
          </p>
        </div>
      </div>
      <dl className="border-t border-[var(--r-grid)]">
        {benefits.map(([title, body]) => (
          <div key={title} className="grid grid-cols-1 border-b border-[var(--r-grid)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <dt className={`${styles.display} ${GUTTER} pt-6 text-[clamp(1.6rem,2.6vw,2.1rem)] md:border-r md:border-[var(--r-grid)] md:py-7`}>{title}</dt>
            <dd className={`${styles.prose} ${GUTTER} max-w-[56ch] pb-6 pt-2 text-[16px] leading-[1.6] text-[var(--r-ink-2)] md:py-7`}>{body}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function MiniTable({ caption, head, rows, note }: { caption: string; head: string[]; rows: ReactNode[][]; note?: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-left text-[15px]">
        <caption className={`${styles.label} border-b border-[var(--r-grid)] bg-[var(--r-header)] px-4 py-3 text-left text-[12px] text-[var(--r-ink-2)] sm:px-5`}>
          {caption}
        </caption>
        <thead>
          <tr>
            {head.map(cell => (
              <th key={cell} scope="col" className={`${styles.cell} px-4 py-2.5 text-[13px] font-semibold text-[var(--r-ink-3)] sm:px-5`}>{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={`${styles.cell} px-4 py-3 text-[var(--r-ink)] sm:px-5`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {note ? <div className="flex items-center gap-2.5 border-b border-[var(--r-grid)] px-4 py-3 text-[14px] text-[var(--r-ink-2)] sm:px-5">{note}</div> : null}
    </div>
  )
}

function CategoryCell({ category }: { category: (typeof CATEGORIES)[number]['key'] }) {
  const item = fill(category)
  return (
    <span className="flex items-center gap-2.5 whitespace-nowrap">
      <span className="h-3 w-3 flex-shrink-0" style={{ background: item.fill }} aria-hidden="true" />
      {item.label}
    </span>
  )
}

const features = [
  {
    title: 'One portfolio for everything you do.',
    body: 'Keep audits, teaching, reflections, procedures, publications, leadership, conferences and prizes in one place. It stays with you through rotations, trusts and training stages.',
    table: (
      <MiniTable
        caption="Portfolio, example entries"
        head={['Category', 'Entry', 'Date']}
        rows={[
          [<CategoryCell key="c" category="audit" />, 'VTE prophylaxis re-audit', 'Aug 2024'],
          [<CategoryCell key="c" category="teaching" />, 'OSCE teaching, 3rd years', 'Nov 2024'],
          [<CategoryCell key="c" category="courses" />, 'ALS certificate', 'Mar 2025'],
          [<CategoryCell key="c" category="teaching" />, 'Grand round talk', 'Oct 2025'],
          [<CategoryCell key="c" category="leadership" />, 'FY2 forum rep', 'Feb 2026'],
        ]}
      />
    ),
  },
  {
    title: 'See your evidence alongside specialty criteria.',
    body: 'Link existing entries to published application domains and see where you have supporting evidence. You decide how it applies to your application.',
    table: (
      <MiniTable
        caption="IMT 2026, example links"
        head={['Application domain', 'Linked entries']}
        rows={[
          ['Quality Improvement', '2'],
          ['Teaching Experience', '1'],
          ['Presentations & Posters', '1'],
          ['Publications', <span key="n" className="text-[var(--r-ink-3)]">None linked yet</span>],
        ]}
        note="Counts only. Clerkfolio shows what you have linked; you judge how it applies."
      />
    ),
  },
  {
    title: 'Log cases while the details are fresh.',
    body: 'Record anonymised cases with clinical area, learning and supporting evidence, from your phone or your desktop.',
    table: (
      <MiniTable
        caption="Cases, example log"
        head={['Date', 'Clinical area', 'Case']}
        rows={[
          ['Jan 2025', 'Endocrinology', 'DKA in type 1 diabetes'],
          ['Dec 2025', 'Cardiology', 'Anterior STEMI'],
          ['Feb 2026', 'Respiratory', 'Community-acquired pneumonia'],
        ].map(([date, area, title]) => [
          date,
          area,
          <span key="t" className="flex items-center gap-2.5">
            <span className="h-3 w-3 flex-shrink-0 bg-[var(--r-cat-cases)]" aria-hidden="true" />
            {title}
          </span>,
        ])}
        note={<><LockIcon className="text-[var(--r-ink-3)]" />Anonymised: no names, dates of birth or NHS numbers.</>}
      />
    ),
  },
] as const

const supportingTools = [
  ['Evidence beside the entry', 'Keep supporting files with the case, activity or achievement they relate to.'],
  ['Search, timelines and imports', 'Find previous work, review your activity over time and bring supported records into one place.'],
  ['Exports and focused sharing', 'Create application PDFs, CSV, JSON or ZIP backups, and share selected portfolio evidence through a required-PIN link.'],
] as const

export function FeaturesSheet() {
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-16 border-t-2 border-[var(--r-ink)]">
      <SheetHeading id="features-title" sub="Add entries, find them again, and use them when you need them.">
        One place for the evidence you build over time.
      </SheetHeading>
      {features.map((feature, index) => (
        <div key={feature.title} className="grid grid-cols-1 border-t border-[var(--r-grid)] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className={`${GUTTER} py-8 lg:border-r lg:border-[var(--r-grid)] lg:py-12 ${index % 2 === 1 ? 'lg:order-2 lg:border-l lg:border-r-0' : ''}`}>
            <h3 className={`${styles.display} max-w-[16ch] text-[clamp(1.9rem,3.2vw,2.75rem)]`}>{feature.title}</h3>
            <p className={`${styles.prose} mt-4 max-w-[46ch] text-[16px] leading-[1.6] text-[var(--r-ink-2)]`}>{feature.body}</p>
          </div>
          <div className="flex min-w-0 flex-col justify-center border-t border-[var(--r-grid)] lg:border-t-0">{feature.table}</div>
        </div>
      ))}
      <dl className="border-t-2 border-[var(--r-ink)]">
        {supportingTools.map(([title, body]) => (
          <div key={title} className="grid grid-cols-1 border-b border-[var(--r-grid)] md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <dt className={`${GUTTER} pt-5 text-[17px] font-semibold md:border-r md:border-[var(--r-grid)] md:py-5`}>{title}</dt>
            <dd className={`${styles.prose} ${GUTTER} max-w-[64ch] pb-5 pt-1.5 text-[15px] leading-[1.6] text-[var(--r-ink-2)] md:py-5`}>{body}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

const reassurances = [
  ['Patient information', 'Do not enter names, dates of birth, NHS numbers or other patient-identifiable information.'],
  ['Focused sharing', 'Portfolio share links require a PIN and an expiry date. Case entries are never included.'],
  ['Your records', 'Export your data when you need it and request account deletion when you are finished.'],
] as const

const exportFormats = ['PDF', 'Word', 'CSV', 'JSON', 'ZIP'] as const

export function PrivacySheet() {
  return (
    <section id="privacy-and-control" aria-labelledby="privacy-title" className="scroll-mt-16 bg-[var(--r-band)] text-[var(--r-band-ink)]">
      <SheetHeading
        id="privacy-title"
        tone="band"
        sub="Clerkfolio helps you organise professional evidence without turning clinical records into shareable portfolio content."
      >
        Built for careful professional record-keeping.
      </SheetHeading>
      <dl className="border-t border-[var(--r-band-grid)]">
        {reassurances.map(([title, body]) => (
          <div key={title} className="grid grid-cols-1 border-b border-[var(--r-band-grid)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <dt className={`${styles.display} ${GUTTER} flex items-center gap-3 pt-6 text-[clamp(1.6rem,2.6vw,2.1rem)] md:border-r md:border-[var(--r-band-grid)] md:py-7`}>
              {title}
            </dt>
            <dd className={`${styles.prose} ${GUTTER} max-w-[56ch] pb-6 pt-2 text-[16px] leading-[1.6] text-[var(--r-band-ink-2)] md:py-7`}>{body}</dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-1 border-b border-[var(--r-band-grid)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <p className={`${GUTTER} flex items-center pt-6 text-[15px] font-semibold md:border-r md:border-[var(--r-band-grid)] md:py-6`}>Export formats</p>
        <ul className="mt-4 grid grid-cols-5 border-t border-[var(--r-band-grid)] md:mt-0 md:flex md:border-t-0">
          {exportFormats.map(format => (
            <li key={format} className="flex min-h-14 items-center justify-center border-r border-[var(--r-band-grid)] px-2 text-[15px] font-semibold last:border-r-0 md:min-h-[72px] md:min-w-[88px] md:px-4 md:last:border-r">
              {format}
            </li>
          ))}
        </ul>
      </div>
      <p className={`${styles.prose} ${GUTTER} max-w-[68ch] py-10 text-[15px] leading-[1.65] text-[var(--r-band-ink-2)]`}>
        Clerkfolio is independent. It is not affiliated with the NHS, GMC or any Royal College, and it does not replace a portfolio required by your deanery or training programme.
      </p>
    </section>
  )
}

const audiences = [
  {
    label: 'Medical students',
    title: 'Start your portfolio before foundation training.',
    body: 'Keep audits, teaching, prizes, reflections and anonymised cases from the start. Tag anything you may want for foundation or academic applications.',
    bullets: ['Anonymised case journal', 'Track audits, QIPs and prizes', `A verified .ac.uk email gives you up to ${formatStorageQuota(VERIFIED_STORAGE_MB)} storage`],
  },
  {
    label: 'Foundation doctors',
    title: 'Keep your evidence in one place.',
    body: 'Log a case while it is fresh, save the supporting files and tag it for a specialty if it is relevant. When applications open, you can find what you need.',
    bullets: ['Quick logging from phone or desktop', 'Specialty self-assessment mapping', 'Share selected portfolio evidence'],
  },
  {
    label: 'Preparing applications',
    title: 'Your portfolio stays with you.',
    body: 'Your Clerkfolio portfolio belongs to you, not your trust. Move hospital, deanery, specialty or role and keep the same record.',
    bullets: ['Track supported specialties', 'Structured achievement categories', 'PDF, CSV, JSON and ZIP exports'],
  },
] as const

export function AudienceSheet() {
  return (
    <section id="audience" aria-labelledby="audience-title" className="scroll-mt-16 border-t-2 border-[var(--r-ink)]">
      <SheetHeading id="audience-title" sub="Keep one record as your role and priorities change.">
        For medical school, foundation training and beyond.
      </SheetHeading>
      <div className="border-t border-[var(--r-grid)]">
        {audiences.map(audience => (
          <article key={audience.label} className="grid grid-cols-1 border-b border-[var(--r-grid)] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,0.9fr)]">
            <h3 className={`${styles.display} ${GUTTER} pt-7 text-[clamp(2rem,3.4vw,3rem)] lg:border-r lg:border-[var(--r-grid)] lg:py-8`}>{audience.label}</h3>
            <div className={`${GUTTER} py-5 lg:border-r lg:border-[var(--r-grid)] lg:py-8`}>
              <p className="text-[19px] font-semibold leading-snug">{audience.title}</p>
              <p className={`${styles.prose} mt-3 max-w-[56ch] text-[16px] leading-[1.6] text-[var(--r-ink-2)]`}>{audience.body}</p>
            </div>
            <ul className="border-t border-[var(--r-grid)] lg:border-t-0 lg:py-3">
              {audience.bullets.map(bullet => (
                <li key={bullet} className={`${GUTTER} flex min-h-11 items-center gap-3 py-2 text-[15px] lg:px-6`}>
                  <CheckIcon />
                  {bullet}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}

function PricingValue({ value }: { value: boolean | string }) {
  if (value === true) return <><CheckIcon /><span className="sr-only">Included</span></>
  if (value === false) return <><DashIcon className="text-[var(--r-ink-3)]" /><span className="sr-only">Not included</span></>
  return <span>{value}</span>
}

export function PricingSheet() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-16 border-t-2 border-[var(--r-ink)]">
      <SheetHeading id="pricing-title" sub={'No card needed to start. The free plan is fully usable on its own. Pro is £9.99 a year.'}>
        Free to use. Upgrade to Pro when you need more.
      </SheetHeading>
      <div className="overflow-x-auto border-t border-[var(--r-grid)]">
        <table className="w-full min-w-[340px] table-fixed border-collapse text-left">
          <caption className="sr-only">Plan comparison</caption>
          <colgroup>
            <col className="w-[40%] md:w-[46%]" />
            <col />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr className="align-top">
              <th scope="col" className={`${styles.cell} bg-[var(--r-header)] px-4 py-5 text-[14px] font-semibold text-[var(--r-ink-3)] sm:px-6 lg:px-10`}>Plan</th>
              {PRICING_TIERS.map(tier => (
                <th key={tier.name} scope="col" className={`${styles.cell} bg-[var(--r-header)] px-3 py-5 sm:px-5`}>
                  <span className={`${styles.display} block text-[clamp(1.5rem,3vw,2.4rem)]`}>{tier.name}</span>
                  <span className={`mt-2 block text-[13px] font-medium leading-snug sm:text-[14px] ${tier.highlight ? 'text-[var(--r-ink)]' : 'text-[var(--r-ink-2)]'}`}>
                    {tier.marketingPrice}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PRICING_FEATURES.map(feature => (
              <tr key={feature.label}>
                <th scope="row" className={`${styles.cell} px-4 py-3.5 text-[14px] font-medium leading-snug text-[var(--r-ink)] sm:px-6 sm:text-[15px] lg:px-10`}>{feature.label}</th>
                {([feature.free, feature.verified, feature.pro] as const).map((value, index) => (
                  <td key={index} className={`${styles.cell} px-3 py-3.5 text-[14px] leading-snug text-[var(--r-ink)] sm:px-5 sm:text-[15px]`}>
                    <PricingValue value={value} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={`${styles.prose} ${GUTTER} max-w-[68ch] py-8 text-[15px] leading-[1.65] text-[var(--r-ink-2)]`}>
        Working in the NHS? Verifying an nhs.net (or other NHS) email adds extra storage to the free Verified plan. ARCP capability tracking is included for eligible training stages - set yours during onboarding.
      </p>
    </section>
  )
}

export function FaqSheet() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-16 border-t-2 border-[var(--r-ink)]">
      <SheetHeading id="faq-title">Frequently asked questions.</SheetHeading>
      <div className="border-t border-[var(--r-grid)]">
        {LANDING_FAQS.map(([question, answer]) => (
          <details key={question} className="group border-b border-[var(--r-grid)] open:bg-[var(--r-header)]">
            <summary className={`${styles.faqSummary} ${GUTTER} flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-6 py-4 text-[17px] font-semibold sm:text-[19px]`}>
              {question}
              <PlusIcon className={`${styles.faqIcon} text-[var(--r-ink-3)]`} />
            </summary>
            <p className={`${styles.prose} ${GUTTER} max-w-[72ch] pb-6 text-[16px] leading-[1.65] text-[var(--r-ink-2)]`}>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
