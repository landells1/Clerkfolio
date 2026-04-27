import Link from 'next/link'

const SOURCES = [
  {
    name: 'Horus',
    status: 'Planned',
    summary: 'Portfolio and procedure exports mapped into Clinidex portfolio, cases, and logbook rows.',
  },
  {
    name: 'Turas',
    status: 'Planned',
    summary: 'Scottish ePortfolio exports with source-aware column names and activity labels.',
  },
  {
    name: 'Local spreadsheet',
    status: 'Planned',
    summary: 'Excel or CSV templates for users moving from personal trackers.',
  },
]

const ROADMAP = [
  'Detect the source format before parsing rows.',
  'Preview every row before anything is saved.',
  'Let users remap uploaded columns into Clinidex fields.',
  'Flag likely duplicates using source, title, date, category, and procedure metadata.',
  'Block obvious patient identifiers in case and logbook imports.',
  'Save an import batch record so uploads can be reviewed or rolled back safely.',
]

export default function ImportPage() {
  return (
    <div className="p-8 max-w-5xl">
      <nav className="flex items-center gap-1.5 text-xs text-[rgba(245,245,242,0.4)] mb-6">
        <Link href="/dashboard" className="hover:text-[#F5F5F2] transition-colors">Dashboard</Link>
        <span>/</span>
        <span className="text-[rgba(245,245,242,0.7)]">Import</span>
      </nav>
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Import roadmap</h1>
          <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-300">
            Uploads paused
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[rgba(245,245,242,0.5)]">
          Generic CSV import is paused while we move to source-specific imports that can be checked,
          remapped, and deduplicated before anything reaches the portfolio.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {SOURCES.map(source => (
          <div key={source.name} className="rounded-lg border border-white/[0.07] bg-[#141416] p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[#F5F5F2]">{source.name}</h2>
              <span className="rounded-full border border-[#1B6FD9]/30 bg-[#1B6FD9]/10 px-2 py-0.5 text-[11px] font-medium text-[#69A7F2]">
                {source.status}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-[rgba(245,245,242,0.48)]">{source.summary}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-lg border border-white/[0.07] bg-[#141416] p-6">
          <h2 className="mb-4 text-sm font-semibold text-[#F5F5F2]">Build order</h2>
          <ol className="space-y-3">
            {ROADMAP.map((item, index) => (
              <li key={item} className="flex gap-3 text-sm text-[rgba(245,245,242,0.55)]">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1B6FD9]/15 text-xs font-semibold text-[#69A7F2]">
                  {index + 1}
                </span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-lg border border-white/[0.07] bg-[#141416] p-6">
          <h2 className="mb-3 text-sm font-semibold text-[#F5F5F2]">Current safe path</h2>
          <p className="text-sm leading-relaxed text-[rgba(245,245,242,0.48)]">
            Add entries manually from Portfolio, Cases, or Logbook for now. The import flow should not
            accept uploads until Horus, Turas, and local spreadsheet variants have source-specific parsing,
            duplicate checks, and a review step.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/portfolio/new"
              className="rounded-lg bg-[#1B6FD9] px-3.5 py-2 text-sm font-semibold text-[#0B0B0C] transition-colors hover:bg-[#155BB0]"
            >
              Add portfolio entry
            </Link>
            <Link
              href="/cases/new"
              className="rounded-lg border border-white/[0.08] px-3.5 py-2 text-sm font-medium text-[rgba(245,245,242,0.65)] transition-colors hover:text-[#F5F5F2]"
            >
              Add case
            </Link>
            <Link
              href="/logbook"
              className="rounded-lg border border-white/[0.08] px-3.5 py-2 text-sm font-medium text-[rgba(245,245,242,0.65)] transition-colors hover:text-[#F5F5F2]"
            >
              Open logbook
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
