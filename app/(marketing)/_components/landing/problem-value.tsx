import { SectionHeader } from './section-header'

const benefits = [
  {
    title: 'Keep one personal record',
    body: 'Bring achievements, reflections, evidence and anonymised cases together instead of rebuilding the same history for every move or application.',
  },
  {
    title: 'Find useful evidence again',
    body: 'Search structured entries, use consistent tags and keep supporting files beside the work they evidence.',
  },
  {
    title: 'Take it to the next stage',
    body: 'Export your records, prepare focused application packs or share selected portfolio evidence when you need it.',
  },
] as const

export function ProblemValue() {
  return (
    <section className="border-y border-default bg-[var(--bg-surface)] px-6 py-14 sm:py-20 md:px-14">
      <SectionHeader
        label="Why Clerkfolio"
        title="Your evidence should not disappear between systems."
        sub="Cases, certificates, reflections and application evidence often end up across notes, inboxes, spreadsheets and official training systems. Clerkfolio gives you one personal record in which to organise them."
      />
      <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-subtle bg-[var(--border-subtle)] md:grid-cols-3">
        {benefits.map((benefit, index) => (
          <article key={benefit.title} className="bg-[var(--bg-canvas)] p-6 sm:p-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">0{index + 1}</p>
            <h3 className="mt-4 text-xl font-medium tracking-[-0.025em] text-ink">{benefit.title}</h3>
            <p className="mt-3 text-sm leading-6 text-ink-soft">{benefit.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
