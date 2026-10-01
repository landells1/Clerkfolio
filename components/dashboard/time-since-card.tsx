import { CATEGORIES, type Category } from '@/lib/types/portfolio'
import { ageLabel, latestPastDate } from '@/lib/dashboard/date-stats'

type Row = {
  category: Category | 'cases'
  label: string
  lastDate: string | null
}

export default function TimeSinceCard({ rows, todayKey }: { rows: Row[]; todayKey: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Time since last entry</p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">By the date on each entry and case</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rows.map(row => (
          <div key={row.category} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[var(--bg-canvas)] px-3 py-2">
            <span className="truncate text-xs text-[var(--text-secondary)]">{row.label}</span>
            <span className="ml-3 rounded-md bg-white/[0.06] px-2 py-1 text-[11px] font-medium text-[var(--text-primary)]">{ageLabel(row.lastDate, todayKey)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Latest entry DATE per category (not when it was typed in), so backfilled
// work reads "5mo ago" instead of "Today". Future-dated rows are ignored.
export function buildTimeSinceRows(entries: { category: Category; date: string }[], cases: { date: string }[], todayKey: string) {
  const rows: Row[] = CATEGORIES.map(category => ({
    category: category.value,
    label: category.short,
    lastDate: latestPastDate(entries.filter(entry => entry.category === category.value), todayKey),
  }))
  rows.unshift({
    category: 'cases',
    label: 'Cases',
    lastDate: latestPastDate(cases, todayKey),
  })
  return rows
}
