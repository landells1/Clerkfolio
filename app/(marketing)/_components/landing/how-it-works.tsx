import { SectionHeader } from './section-header'

const steps = [
  ['01', 'Log', 'Add cases or portfolio entries from your phone or desktop. Case drafts save automatically.'],
  ['02', 'Tag', 'Add clinical-area and specialty tags, then reuse them across your entries.'],
  ['03', 'Use', 'Link entries to specialty domains, export a PDF, or share selected portfolio entries with a PIN.'],
] as const

export function HowItWorks() {
  return (
    <section id="how" className="px-6 py-16 sm:py-20 md:px-14 xl:py-20">
      <SectionHeader label="How it works" title="Use it as you go." />
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
