import { VERIFIED_STORAGE_MB, formatStorageQuota } from '@/lib/entitlements/limits'
import { SectionHeader } from './section-header'

const cards = [
  [
    'MEDICAL STUDENTS',
    'Start your portfolio before foundation training.',
    'Keep audits, teaching, prizes, reflections and anonymised cases from the start. Tag anything you may want for foundation or academic applications.',
    ['Anonymised case journal', 'Track audits, QIPs and prizes', `A verified .ac.uk email gives you up to ${formatStorageQuota(VERIFIED_STORAGE_MB)} storage`],
  ],
  [
    'FOUNDATION DOCTORS',
    'Keep your evidence in one place.',
    "Log a case while it is fresh, save the supporting files and tag it for a specialty if it is relevant. When applications open, you can find what you need.",
    ['Quick logging from phone or desktop', 'Specialty self-assessment mapping', 'Share selected portfolio evidence'],
  ],
  [
    'PREPARING APPLICATIONS',
    'Your portfolio stays with you.',
    'Your Clerkfolio portfolio belongs to you, not your trust. Move hospital, deanery, specialty or role and keep the same record.',
    ['Track supported specialties', 'Structured achievement categories', 'PDF, CSV, JSON and ZIP exports'],
  ],
] as const

export function Audience() {
  return (
    <section id="audience" className="px-6 py-16 sm:py-20 md:px-14 xl:py-20">
      <SectionHeader
        label="Who it is for"
        title="For medical school, foundation training and beyond."
        sub="Keep one record as your role and priorities change."
      />
      <div className="mt-10 grid grid-cols-1 gap-6 sm:mt-12 md:grid-cols-2 lg:grid-cols-3">
        {cards.map(([tag, title, body, bullets]) => (
          <article key={tag} className="rounded-2xl border border-default bg-[var(--bg-surface)] p-5 sm:p-7 md:last:col-span-2 lg:last:col-span-1">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">{tag}</p>
            <h3 className="text-[22px] font-medium leading-tight tracking-[-0.02em]">{title}</h3>
            <p className="mt-3 text-[13px] leading-[1.6] text-ink-soft">{body}</p>
            <div className="my-5 h-px bg-[var(--border-default)]" />
            <ul className="space-y-3">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2 text-sm text-ink-soft">
                  <span className="text-accent" aria-hidden="true">→</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
