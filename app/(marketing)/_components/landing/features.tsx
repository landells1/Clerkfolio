import type { ReactNode } from 'react'
import { SectionHeader } from './section-header'
import { MockCasesList } from './mocks/mock-cases-list'
import { MockChecklist } from './mocks/mock-checklist'
import { MockPortfolio } from './mocks/mock-portfolio'

// Ordered by importance (owner positioning, 2026-07-13): the career-long
// portfolio leads, then getting into training, then case logging.
const features = [
  {
    tag: '01 / PORTFOLIO',
    title: 'One portfolio for everything you do.',
    body: 'Keep audits, teaching, reflections, procedures, publications, leadership, conferences and prizes in one place. It stays with you through rotations, trusts and training stages.',
    mock: <MockPortfolio compact className="h-[350px] sm:h-[390px]" />,
  },
  {
    tag: '02 / SPECIALTIES',
    title: 'See your evidence alongside specialty criteria.',
    body: 'Link existing entries to published application domains and see where you have supporting evidence. You decide how it applies to your application.',
    mock: <MockChecklist compact className="h-[350px] sm:h-[390px]" />,
  },
  {
    tag: '03 / CASES',
    title: 'Log cases while the details are fresh.',
    body: 'Record anonymised cases with clinical area, learning and supporting evidence. Drafts save automatically while you write.',
    mock: <MockCasesList compact className="h-[350px] sm:h-[390px]" />,
    wide: true,
  },
] as const

const supportingTools = [
  ['Evidence beside the entry', 'Keep supporting files with the case, activity or achievement they relate to.'],
  ['Search, timelines and imports', 'Find previous work, review your activity over time and bring supported records into one place.'],
  ['Exports and focused sharing', 'Create application PDFs, CSV, JSON or ZIP backups, and share selected portfolio evidence through a required-PIN link.'],
] as const

export function Features() {
  return (
    <section id="features" className="px-6 py-16 sm:py-20 md:px-14 xl:py-20">
      <SectionHeader
        label="What you can do"
        title="One place for the evidence you build over time."
        sub="Add entries, find them again, and use them when you need them."
      />
      <div className="mt-10 grid grid-cols-1 gap-6 sm:mt-12 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => <FeatureCard key={feature.tag} {...feature} />)}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {supportingTools.map(([title, body]) => (
          <article key={title} className="rounded-xl border border-default bg-[var(--bg-surface)] p-5">
            <h3 className="text-base font-medium tracking-[-0.015em] text-ink">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function FeatureCard({ tag, title, body, mock, wide = false }: { tag: string; title: string; body: string; mock: ReactNode; wide?: boolean }) {
  return (
    <article className={`rounded-2xl border border-default bg-[var(--bg-surface)] p-5 sm:p-7 ${wide ? 'md:col-span-2 md:grid md:grid-cols-[0.7fr_1.3fr] md:gap-8 xl:col-span-1 xl:block' : ''}`}>
      <div>
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">{tag}</p>
        <h3 className="text-[22px] font-medium leading-tight tracking-[-0.025em] text-ink sm:text-[26px]">{title}</h3>
        <p className="mt-3 text-sm leading-[1.6] text-ink-soft">{body}</p>
      </div>
      <div className={`mt-6 min-w-0 overflow-hidden ${wide ? 'md:mt-0 xl:mt-6' : ''}`}>{mock}</div>
    </article>
  )
}
