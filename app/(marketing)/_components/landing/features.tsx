import type { ReactNode } from 'react'
import { SectionHeader } from './section-header'
import { MockCaseForm } from './mocks/mock-case-form'
import { MockCasesList } from './mocks/mock-cases-list'
import { MockChecklist } from './mocks/mock-checklist'
import { MockPortfolio } from './mocks/mock-portfolio'
import { MockShareLink } from './mocks/mock-share-link'

const features = [
  {
    tag: '01 / CASES',
    title: 'Quick to log between patients.',
    body: 'Anonymised case entries with clinical area, application tags, notes and evidence files. Drafts auto-save while you write.',
    mock: <MockCasesList className="h-auto lg:h-[420px]" />,
  },
  {
    tag: '02 / PORTFOLIO',
    title: 'Audits, teaching, reflections - one shape.',
    body: 'Eight categories: audit / QIP, teaching, reflection, procedure, publication, leadership, conference, prize. Each with the fields that actually matter.',
    mock: <MockPortfolio className="h-auto lg:h-[420px]" />,
  },
  {
    tag: '03 / SPECIALTIES',
    title: 'See where your evidence is thin, before ARCP.',
    body: "Map portfolio evidence onto each specialty's self-assessment domains, and see which ones still need evidence.",
    mock: <MockChecklist className="h-auto lg:h-[420px]" />,
    wide: true,
  },
  {
    tag: '04 / SHARE',
    title: 'A link you can share with your supervisor.',
    body: 'Filtered by specialty or theme. Optional 4-8 digit PIN. Set it to expire in a day, a week, a month - or revoke it now. Every view audited.',
    mock: <MockShareLink className="h-auto lg:h-[400px]" />,
  },
  {
    tag: '05 / EXPORT',
    title: 'Export exactly what an application needs.',
    body: 'PDF for application packs. CSV or JSON for your records. Full ZIP backup on demand - your data is never locked in.',
    mock: <MockCaseForm className="h-auto lg:h-[400px]" />,
  },
] as const

export function Features() {
  return (
    <section id="features" className="px-6 py-16 sm:py-24 md:px-14 lg:py-32">
      <SectionHeader
        number="002"
        label="What you can do with it"
        title="One organised record of your evidence."
        sub="Every entry is tagged and searchable. Five tools, all built on the same anonymised record."
      />
      <div className="mt-10 grid grid-cols-1 gap-6 sm:mt-16 lg:grid-cols-2">
        {features.map((feature) => <FeatureCard key={feature.tag} {...feature} />)}
      </div>
    </section>
  )
}

function FeatureCard({ tag, title, body, mock, wide }: { tag: string; title: string; body: string; mock: ReactNode; wide?: boolean }) {
  return (
    <article className={`rounded-2xl border border-default bg-[var(--bg-surface)] p-5 sm:p-7 ${wide ? 'lg:col-span-2 lg:grid lg:grid-cols-[0.75fr_1.25fr] lg:gap-8' : ''}`}>
      <div>
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">{tag}</p>
        <h3 className="text-[22px] font-medium leading-tight tracking-[-0.025em] text-ink sm:text-[26px]">{title}</h3>
        <p className="mt-3 text-sm leading-[1.6] text-ink-soft">{body}</p>
      </div>
      <div className="mt-6 min-w-0 overflow-hidden lg:mt-0">{mock}</div>
    </article>
  )
}
