import Link from 'next/link'
import type { ThemeCoverageRow } from '@/lib/portfolio/theme-coverage'

// Deep-links to the portfolio search grammar's `theme:` filter (same pattern
// as CalendarWidget's `q=since:${key}` links). Values with spaces still
// match correctly - the plain terms left over after `theme:<first word>` is
// parsed off fall back to matching the full interview_themes text, which
// already contains those words - see tests/lib/search/parser.test.ts.
function themeHref(slug: string) {
  return `/portfolio?q=${encodeURIComponent(`theme:${slug}`)}`
}

export default function CompetencyThemeWidget({ rows }: { rows: ThemeCoverageRow[] }) {
  const max = Math.max(1, ...rows.map(r => r.count))

  return (
    <div className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Competency theme coverage</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Entries and cases by theme tag</p>
        </div>
        <Link
          href="/portfolio?view=themes"
          prefetch={false}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          View all →
        </Link>
      </div>

      <div className="p-4 space-y-1.5">
        {rows.map(row => {
          const pct = (row.count / max) * 100
          return (
            <Link
              key={row.slug}
              href={themeHref(row.slug)}
              prefetch={false}
              className="flex min-h-[44px] items-center gap-3 rounded-lg px-1 -mx-1 group hover:bg-white/[0.03] transition-colors"
            >
              <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors w-36 shrink-0 truncate" title={row.label}>
                {row.label}
              </span>
              <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="shrink-0 text-xs font-mono text-[var(--text-secondary)] w-5 text-right">
                {row.count}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
