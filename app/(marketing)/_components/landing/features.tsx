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
    title: 'Log it between patients.',
    body: 'Anonymised case entries with clinical area, application tags, notes and evidence files. Drafts auto-save while you write.',
    mock: <MockCasesList className="h-[420px]" />,
  },
  {
    tag: '02 / PORTFOLIO',
    title: 'Audits, teaching, reflections — one shape.',
    body: 'Eight categories: audit / QIP, teaching, reflection, procedure, publication, leadership, conference, prize. Each with the fields that actually matter.',
    mock: <MockPortfolio className="h-[420px]" />,
  },
  {
    tag: '03 / SPECIALTIES',
    title: 'See the gaps before ARCP does.',
    body: "Map portfolio evidence onto each specialty's self-assessment domains. Watch your scoring sheet fill itself in as you log.",
    mock: <MockChecklist className="h-[420px]" />,
    wide: true,
  },
  {
    tag: '04 / SHARE',
    title: 'A link your consultant can open.',
    body: 'Filtered by specialty or theme. Optional 4-8 digit PIN. Set it to expire in a day, a week, a month — or revoke it now. Every view audited.',
    mock: <MockShareLink className="h-[400px]" />,
  },
  {
    tag: '05 / EXPORT',
    title: 'The exact slice you need, for any application.',
    body: 'PDF for application packs. CSV or JSON for your records. Full ZIP backup on demand — your data never gets locked in.',
    mock: <MockCaseForm className="h-[400px]" />,
  },
] as const

export function Features() {
  return (
    <section id="features" className="px-6 py-24 md:px-14 lg:py-32">
      <SectionHeader
        number="002"
        label="What you can do with it"
        title="Built like a reference system."
        sub="Every entry indexed, tagged, retrievable. Five core surfaces — all working off the same anonymised log."
      />
      <div className="mt-16 grid gap-6 lg:grid-cols-2">
        {features.map((feature) => <FeatureCard key={feature.tag} {...feature} />)}
      </div>
    </section>
  )
}

function FeatureCard({ tag, title, body, mock, wide }: { tag: string; title: string; body: string; mock: ReactNode; wide?: boolean }) {
  return (
    <article className={`rounded-2xl border border-white/[0.08] bg-[#141416] p-7 ${wide ? 'lg:col-span-2 lg:grid lg:grid-cols-[0.75fr_1.25fr] lg:gap-8' : ''}`}>
      <div>
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">{tag}</p>
        <h3 className="text-[26px] font-medium leading-tight tracking-[-0.025em] text-ink">{title}</h3>
        <p className="mt-3 text-sm leading-[1.6] text-ink-soft">{body}</p>
      </div>
      <div className="mt-6 min-w-0 overflow-hidden lg:mt-0">{mock}</div>
    </article>
  )
}
