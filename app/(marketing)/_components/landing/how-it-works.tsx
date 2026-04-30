import { SectionHeader } from './section-header'

const steps = [
  ['01', 'Log', 'Add cases or portfolio entries from phone or desktop. Anonymised by default — drafts auto-save.'],
  ['02', 'Tag', 'Apply clinical area and application tags (IMT, CST, GP, ACCS, anything). Reuse them across entries.'],
  ['03', 'Map', 'Link entries to specialty self-assessment domains. Your scoring sheet fills itself in.'],
  ['04', 'Export', 'PDF for the application. CSV / JSON for your records. Or a passphrase-protected share link.'],
] as const

export function HowItWorks() {
  return (
    <section id="how" className="bg-[#141416] px-6 py-24 md:px-14 lg:py-32">
      <SectionHeader number="004" label="How it works" title="Four moves. Repeat forever." />
      <div className="mt-16 grid overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.06] md:grid-cols-2 md:gap-px lg:grid-cols-4">
        {steps.map(([number, title, body]) => (
          <article key={number} className="min-h-[240px] bg-[#141416] p-8">
            <p className="mb-7 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">{number}</p>
            <h3 className="text-4xl font-medium tracking-[-0.03em]">{title}</h3>
            <p className="mt-4 text-sm leading-[1.6] text-ink-soft">{body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
