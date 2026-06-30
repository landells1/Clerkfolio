const COPY = {
  early: {
    title: 'Build the habit early',
    body: 'Capture anonymised cases, reflections, and small teaching moments as you go.',
    cta: 'Log your first case',
    href: '/cases/new',
  },
  clinical: {
    title: 'Start shaping your application evidence',
    body: 'Use specialty tags and themes to keep FY and later applications easy to assemble.',
    cta: 'Add portfolio entry',
    href: '/portfolio/new',
  },
  foundation: {
    title: 'Foundation evidence, kept tidy',
    body: 'Track audits, reflections, teaching, rotations, and mandatory training from one place.',
    cta: 'Open logs',
    href: '/logs',
  },
  specialty: {
    title: 'Application-ready portfolio',
    body: 'Compare specialties, mark interview-ready entries, and export tailored bundles.',
    cta: 'Compare specialties',
    href: '/specialties/compare',
  },
}

function bucket(stage: string | null | undefined) {
  if (stage === 'Y1' || stage === 'Y2' || stage === 'Y3') return COPY.early
  if (stage === 'Y4' || stage === 'Y5_PLUS') return COPY.clinical
  if (stage === 'FY1' || stage === 'FY2') return COPY.foundation
  return COPY.specialty
}

export default function CareerWelcomeCard({ stage, caseCount = 0 }: { stage: string | null | undefined; caseCount?: number }) {
  const copy = bucket(stage)
  const adjustedCopy = copy === COPY.early && caseCount > 0
    ? {
        title: 'Keep the case log going',
        body: 'Capture anonymised cases, reflections, and small teaching moments as you go.',
        cta: 'Log another case',
        href: '/cases/new',
      }
    : copy
  return (
    <div className="mb-6 rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
      <h2 className="text-base font-semibold text-[var(--text-primary)]">{adjustedCopy.title}</h2>
      <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">{adjustedCopy.body}</p>
      <a href={adjustedCopy.href} className="mt-4 inline-flex min-h-[40px] items-center rounded-xl bg-[var(--button-primary-bg)] px-4 text-sm font-semibold text-[var(--button-primary-text)]">{adjustedCopy.cta}</a>
    </div>
  )
}
