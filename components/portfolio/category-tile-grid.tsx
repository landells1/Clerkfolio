import Link from 'next/link'
import { CATEGORIES, type Category } from '@/lib/types/portfolio'
import { ageLabel, latestPastDate } from '@/lib/dashboard/date-stats'

type EntryMeta = { category: Category; date: string }

type Props = {
  // All entries (just the lightweight meta fields needed for counts and the
  // latest entry date).
  entries: EntryMeta[]
  // UK calendar day (YYYY-MM-DD) the "Last:" age is measured against.
  todayKey: string
}

// Vercel-style 4-up tile grid replacing the previous chip row. Each tile shows
// the category name, count, and the age of its most recent entry date. Empty categories
// surface an inline "Add first" CTA instead of rendering an empty list below.
const CATEGORY_PILL: Record<Category, { dot: string; bar: string }> = {
  audit_qip:   { dot: 'bg-green-400',   bar: 'bg-green-500' },
  teaching:    { dot: 'bg-violet-400',  bar: 'bg-violet-500' },
  conference:  { dot: 'bg-cyan-400',    bar: 'bg-cyan-500' },
  publication: { dot: 'bg-indigo-400',  bar: 'bg-indigo-500' },
  leadership:  { dot: 'bg-pink-400',    bar: 'bg-pink-500' },
  prize:       { dot: 'bg-amber-400',   bar: 'bg-amber-500' },
  procedure:   { dot: 'bg-rose-400',    bar: 'bg-rose-500' },
  reflection:  { dot: 'bg-blue-400',    bar: 'bg-blue-500' },
  custom:      { dot: 'bg-fg-2',        bar: 'bg-fg-2' },
}

export default function CategoryTileGrid({ entries, todayKey }: Props) {
  // Group entries by category for counts + last-added.
  const byCategory = new Map<Category, EntryMeta[]>()
  entries.forEach(entry => {
    const list = byCategory.get(entry.category) ?? []
    list.push(entry)
    byCategory.set(entry.category, list)
  })

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
      {CATEGORIES.map(category => {
        const list = byCategory.get(category.value) ?? []
        const count = list.length
        // The latest entry DATE, not when it was typed in: a backfilled
        // category reads "5mo ago", not "Today" (future-dated rows ignored).
        const lastDate = latestPastDate(list, todayKey)
        const colour = CATEGORY_PILL[category.value]
        const isEmpty = count === 0
        return (
          <Link
            key={category.value}
            href={`/portfolio?category=${category.value}`}
            // prefetch={false}: one tile per category, all query-param variants of
            // the same expensive /portfolio route — default prefetch renders all 9
            // on mount (the BUG-001 / F-032 prefetch storm). Fetch on click instead.
            prefetch={false}
            className="group relative overflow-hidden rounded-lg border border-subtle bg-surface-1 p-4 hover:border-default hover:bg-surface-2 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${colour.dot}`} />
              <span className="text-[11px] uppercase tracking-wide text-fg-3 font-medium truncate">
                {category.short}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-fg leading-none tabular-nums">{count}</span>
              <span className="text-xs text-fg-2">
                {count === 1 ? 'entry' : 'entries'}
              </span>
            </div>
            <div className="mt-1.5 text-xs text-fg-2 truncate">
              {isEmpty ? (
                <span className="text-[var(--accent-text)] group-hover:text-[var(--accent-text)] transition-colors">+ Add first entry</span>
              ) : (
                <>Last: {lastDate ? ageLabel(lastDate, todayKey).toLowerCase() : 'not yet (future-dated)'}</>
              )}
            </div>
            {!isEmpty && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-surface-3 overflow-hidden">
                <div className={`h-full ${colour.bar}`} style={{ width: `${Math.min(100, count * 10)}%` }} />
              </div>
            )}
          </Link>
        )
      })}
    </div>
  )
}
