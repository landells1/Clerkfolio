import { SectionHeader } from './section-header'

const cards = [
  ['MED STUDENTS', 'Build the evidence your foundation form will ask for.', 'Log every audit, teaching session and prize from year one. Tag what matters for SFP, AFP, or the academic foundation route, and your portfolio builds up as you go.', ['Anonymised case journal', 'Track audits, QIPs, prizes', 'Free forever - verified .ac.uk gets 1 GB storage']],
  ['FOUNDATION (FY1 / FY2)', 'Build your portfolio once, not every application cycle.', "Log a case while it's fresh and tag it once. When applications open, the evidence is already there - just export what you need.", ['Quick-log between patients', 'Map onto specialty self-assessments', 'Share links for supervisors']],
  ['BEYOND FOUNDATION', 'A portfolio that moves with you.', "Run-through, registrar or staff grade - your Clerkfolio portfolio belongs to you, not your trust. Change hospital, deanery or specialty and it comes with you.", ['Unlimited tracked specialties (Pro)', 'GMC-aligned categories', 'Full data export, any time']],
] as const

export function Audience() {
  return (
    <section id="audience" className="px-6 py-16 sm:py-24 md:px-14 lg:py-32">
      <SectionHeader number="003" label="Who it's for" title="Designed for every stage of UK medical training." />
      <div className="mt-10 grid grid-cols-1 gap-6 sm:mt-16 md:grid-cols-3">
        {cards.map(([tag, title, body, bullets]) => (
          <article key={tag} className="rounded-2xl border border-default bg-[var(--bg-surface)] p-5 sm:p-7">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">{tag}</p>
            <h3 className="text-[22px] font-medium leading-tight tracking-[-0.02em]">{title}</h3>
            <p className="mt-3 text-[13px] leading-[1.6] text-ink-soft">{body}</p>
            <div className="my-5 h-px bg-[var(--border-default)]" />
            <ul className="space-y-3">
              {bullets.map((bullet) => <li key={bullet} className="text-sm text-ink-soft"><span className="mr-2 text-accent">→</span>{bullet}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
