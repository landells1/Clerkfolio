import { CATEGORIES, type Category } from '@/lib/types/portfolio'

type Row = {
  category: Category | 'cases'
  label: string
  lastDate: string | null
}

function ageLabel(date: string | null) {
  if (!date) return 'Never'
  const days = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000))
  if (days === 0) return 'Today'
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 10) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export default function TimeSinceCard({ rows }: { rows: Row[] }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#141416] p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold text-[#F5F5F2]">Time since last entry</p>
        <p className="mt-0.5 text-xs text-[rgba(245,245,242,0.4)]">By portfolio category and cases</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map(row => (
          <div key={row.category} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0B0B0C] px-3 py-2">
            <span className="truncate text-xs text-[rgba(245,245,242,0.62)]">{row.label}</span>
            <span className="ml-3 rounded-md bg-white/[0.06] px-2 py-1 text-[11px] font-medium text-[#F5F5F2]">{ageLabel(row.lastDate)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function buildTimeSinceRows(entries: { category: Category; created_at: string }[], cases: { created_at: string }[]) {
  const rows: Row[] = CATEGORIES.map(category => {
    const last = entries
      .filter(entry => entry.category === category.value)
      .map(entry => entry.created_at)
      .sort()
      .at(-1) ?? null
    return { category: category.value, label: category.short, lastDate: last }
  })
  rows.unshift({
    category: 'cases',
    label: 'Cases',
    lastDate: cases.map(item => item.created_at).sort().at(-1) ?? null,
  })
  return rows
}
