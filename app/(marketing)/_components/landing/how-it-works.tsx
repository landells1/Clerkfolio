import { SectionHeader } from './section-header'

const steps = [
  ['01', 'Record what you did', 'Add a structured portfolio entry or log an anonymised clinical case while the details are still fresh. Case forms remind you to remove patient identifiers.'],
  ['02', 'Organise the evidence', 'Attach files, use searchable tags and link relevant entries to supported specialty application domains.'],
  ['03', 'Use it when you need it', 'Find previous work, create focused exports or share selected portfolio evidence through a PIN-protected link.'],
] as const

export function HowItWorks() {
  return (
    <section id="how" className="px-6 py-16 sm:py-20 md:px-14 xl:py-20">
      <SectionHeader label="How it works" title="Record it once. Organise it as your career develops." />
      <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-subtle bg-[var(--border-subtle)] sm:mt-12 md:grid-cols-3">
        {steps.map(([number, title, body]) => (
          <article key={number} className="bg-[var(--bg-surface)] p-6 sm:p-8 md:min-h-[250px]">
            <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">{number}</p>
            <h3 className="text-2xl font-medium tracking-[-0.03em] sm:text-3xl">{title}</h3>
            <p className="mt-4 text-sm leading-[1.6] text-ink-soft">{body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
