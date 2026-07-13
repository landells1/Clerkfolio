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
    title: 'A structured record of your work.',
    body: 'Keep audits, teaching, reflections, procedures, publications, leadership, conferences and prizes in one searchable portfolio that moves with you.',
    mock: <MockPortfolio className="h-[390px] sm:h-auto lg:h-[420px]" />,
  },
  {
    tag: '02 / SPECIALTIES',
    title: 'Evidence mapped to supported specialties.',
    body: 'Link existing evidence to published application domains and see which areas still need supporting entries. Clerkfolio supports self-assessment, not official scoring or outcome prediction.',
    mock: <MockChecklist className="h-[390px] sm:h-auto lg:h-[420px]" />,
  },
  {
    tag: '03 / CASES',
    title: 'Anonymised case logging.',
    body: 'Record clinical area, learning and supporting evidence without entering names, dates of birth, NHS numbers or other patient identifiers. Drafts auto-save while you write.',
    mock: <MockCasesList className="h-[390px] sm:h-auto lg:h-[420px]" />,
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
    <section id="features" className="px-6 py-16 sm:py-20 md:px-14 lg:py-24">
      <SectionHeader
        label="What you can do"
        title="One organised record, built around real portfolio work."
        sub="Record achievements and anonymised cases, organise evidence for supported specialty applications, and find it again when the next review or application arrives."
      />
      <div className="mt-10 grid grid-cols-1 gap-6 sm:mt-12 lg:grid-cols-2">
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
    <article className={`rounded-2xl border border-default bg-[var(--bg-surface)] p-5 sm:p-7 ${wide ? 'lg:col-span-2 lg:grid lg:grid-cols-[0.7fr_1.3fr] lg:gap-8' : ''}`}>
      <div>
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">{tag}</p>
        <h3 className="text-[22px] font-medium leading-tight tracking-[-0.025em] text-ink sm:text-[26px]">{title}</h3>
        <p className="mt-3 text-sm leading-[1.6] text-ink-soft">{body}</p>
      </div>
      <div className={`mt-6 min-w-0 overflow-hidden ${wide ? 'lg:mt-0' : ''}`}>{mock}</div>
    </article>
  )
}
