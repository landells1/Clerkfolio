import Link from 'next/link'

type Props = {
  hasFirstPortfolio: boolean
  hasFirstCase: boolean
  hasTrackedSpecialty: boolean
}

const Card = ({ done, title, body, href, cta }: { done: boolean; title: string; body: string; href: string; cta: string }) => (
  <Link
    href={href}
    className={`flex flex-col gap-2 rounded-2xl border p-5 transition-colors ${done ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/[0.08] bg-[var(--bg-surface)] hover:border-white/[0.16]'}`}
  >
    <div className="flex items-center gap-2">
      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${done ? 'bg-emerald-500 text-[var(--text-inverse)]' : 'border border-white/[0.15] text-[var(--text-secondary)]'}`}>
        {done ? '✓' : ''}
      </span>
      <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
    </div>
    <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{body}</p>
    <span className="mt-auto text-xs font-medium text-[var(--accent-text)]">{done ? 'Done' : cta} &rarr;</span>
  </Link>
)

export default function NewAccountQuickStart({ hasFirstPortfolio, hasFirstCase, hasTrackedSpecialty }: Props) {
  return (
    <section className="rounded-2xl border border-accent/20 bg-accent/[0.04] p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--accent-text)]">Get started</h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Three steps to get your portfolio off the ground. Charts and trends will fill in as you log entries.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card
          done={hasFirstPortfolio}
          title="Log your first entry"
          body="Audit, teaching, course, publication, prize, procedure or reflection - the core building block of your portfolio."
          href="/portfolio/new"
          cta="Add entry"
        />
        <Card
          done={hasFirstCase}
          title="Log your first case"
          body="An anonymised clinical case for your own diary. Great for interview examples and reflection prompts later."
          href="/cases/new"
          cta="Log case"
        />
        <Card
          done={hasTrackedSpecialty}
          title="Track a specialty"
          body="Pick the application you're heading towards. Auto-loads deadlines and lets you score evidence by domain."
          href="/specialties"
          cta="Choose specialty"
        />
      </div>
    </section>
  )
}
