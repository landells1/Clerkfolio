import Link from 'next/link'

export type CalendarWidgetItem = {
  date: string
  type: 'entry' | 'case' | 'deadline'
  title?: string
}

function iso(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function monthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(first)
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7))
  return Array.from({ length: 35 }, (_, index) => {
    const d = new Date(start)
    d.setDate(start.getDate() + index)
    return d
  })
}

export default function CalendarWidget({ items }: { items: CalendarWidgetItem[] }) {
  const now = new Date()
  const days = monthDays(now)
  const counts = new Map<string, { entries: number; deadlines: number }>()
  items.forEach(item => {
    const current = counts.get(item.date) ?? { entries: 0, deadlines: 0 }
    if (item.type === 'deadline') current.deadlines += 1
    else current.entries += 1
    counts.set(item.date, current)
  })

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">This month</p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Entries and upcoming deadlines</p>
        </div>
        <Link href="/timeline" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">Timeline</Link>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[var(--text-secondary)]">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map(day => {
          const key = iso(day)
          const count = counts.get(key)
          const muted = day.getMonth() !== now.getMonth()
          const today = key === iso(now)
          const intensity = Math.min(3, count?.entries ?? 0)
          return (
            <Link
              key={key}
              href={`/portfolio?q=since:${key}`}
              // Each rendered month renders ~35 day cells; without this, Next.js
              // fires a fan-out burst of ~35 simultaneous `?_rsc=` prefetches on
              // dashboard load, a large fraction of which 503 under Vercel's
              // per-IP prefetch rate limit. These are rarely-clicked drill-down
              // links, so prefetch-on-render is not worth the burst. (BUG-001)
              prefetch={false}
              title={`${count?.entries ?? 0} entries, ${count?.deadlines ?? 0} deadlines`}
              className={`relative flex aspect-square min-h-[34px] items-center justify-center rounded-lg border text-xs ${
                today ? 'border-[var(--accent)]' : 'border-white/[0.04]'
              } ${muted ? 'text-[var(--text-faint)]' : 'text-[var(--text-secondary)]'}`}
              style={{ backgroundColor: intensity === 0 ? 'rgba(245,245,242,0.035)' : ['#0A3260', '#155BB0', '#3884DD'][intensity - 1] }}
            >
              {day.getDate()}
              {(count?.deadlines ?? 0) > 0 && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-300" />}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
