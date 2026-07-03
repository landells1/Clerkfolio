import { SectionHeader } from './section-header'

const steps = [
  ['01', 'Log', 'Add cases or portfolio entries from phone or desktop. Anonymised by default - drafts auto-save.'],
  ['02', 'Tag', 'Apply clinical area and application tags (IMT, CST, GP, ACCS, anything). Reuse them across entries.'],
  ['03', 'Map', 'Link entries to specialty self-assessment domains. Your scoring sheet fills itself in.'],
  ['04', 'Export', 'PDF for the application. CSV / JSON for your records. Or a passphrase-protected share link.'],
] as const

export function HowItWorks() {
  return (
    <section id="how" className="bg-[var(--bg-surface)] px-6 py-16 sm:py-24 md:px-14 lg:py-32">
      <SectionHeader number="004" label="How it works" title="Four moves. Repeat forever." />
      <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-subtle bg-[var(--border-subtle)] sm:mt-16 md:grid-cols-2 lg:grid-cols-4">
        {steps.map(([number, title, body]) => (
          <article key={number} className="bg-[var(--bg-surface)] p-6 sm:p-8 md:min-h-[240px]">
            <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.14em] text-accent sm:mb-7">{number}</p>
            <h3 className="text-3xl font-medium tracking-[-0.03em] sm:text-4xl">{title}</h3>
            <p className="mt-4 text-sm leading-[1.6] text-ink-soft">{body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
