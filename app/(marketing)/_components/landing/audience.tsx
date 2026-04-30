import { SectionHeader } from './section-header'

const cards = [
  ['MED STUDENTS', 'Build the evidence your foundation form will ask for.', 'Log every audit, teaching session and prize from year one. Tag what matters for SFP, AFP, or the academic foundation route — your portfolio writes itself.', ['Anonymised case journal', 'Track audits, QIPs, prizes', 'Free forever — verified .ac.uk gets 1 GB storage']],
  ['FOUNDATION (FY1 / FY2)', 'Stop rebuilding your portfolio every application cycle.', "Log on the way back from theatre. Tag once. When specialty applications open, you'll already have the evidence. Just export the slice that fits.", ['Quick-log between patients', 'Map onto specialty self-assessments', 'Share links for supervisors']],
  ['BEYOND FOUNDATION', 'A record that survives your next rotation.', "Run-through, registrar or staff grade — Clerkfolio is yours, not your trust's. Move hospitals, change deaneries, switch specialty. The record stays.", ['Unlimited tracked specialties (Pro)', 'GMC-aligned categories', 'Full data export, any time']],
] as const

export function Audience() {
  return (
    <section id="audience" className="px-6 py-24 md:px-14 lg:py-32">
      <SectionHeader number="003" label="Who it's for" title="Designed for every stage of UK medical training." />
      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {cards.map(([tag, title, body, bullets]) => (
          <article key={tag} className="rounded-2xl border border-white/[0.08] bg-[#141416] p-7">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">{tag}</p>
            <h3 className="text-[22px] font-medium leading-tight tracking-[-0.02em]">{title}</h3>
            <p className="mt-3 text-[13px] leading-[1.6] text-ink-soft">{body}</p>
            <div className="my-5 h-px bg-white/[0.08]" />
            <ul className="space-y-3">
              {bullets.map((bullet) => <li key={bullet} className="text-sm text-ink-soft"><span className="mr-2 text-accent">→</span>{bullet}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
