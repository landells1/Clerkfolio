import Link from 'next/link'
import { CATEGORIES, CATEGORY_COLOURS } from '@/lib/types/portfolio'

type CategoryCount = { category: string; count: number }

export default function CoverageWidget({ counts }: { counts: CategoryCount[] }) {
  const total = counts.reduce((s, c) => s + c.count, 0)
  const max = Math.max(1, ...counts.map(c => c.count))

  const byCategory = Object.fromEntries(counts.map(c => [c.category, c.count]))

  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div>
          <h3 className="text-sm font-semibold text-[#F5F5F2]">Portfolio coverage</h3>
          <p className="text-xs text-[rgba(245,245,242,0.35)] mt-0.5">{total} {total === 1 ? 'entry' : 'entries'} total</p>
        </div>
        <Link href="/portfolio" className="text-xs text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors">
          View all →
        </Link>
      </div>

      <div className="p-4 space-y-2.5">
        {CATEGORIES.map(cat => {
          const count = byCategory[cat.value] ?? 0
          const colour = CATEGORY_COLOURS[cat.value]
          const pct = (count / max) * 100
          return (
            <Link
              key={cat.value}
              href={`/portfolio?category=${cat.value}`}
              className="flex items-center gap-3 group"
            >
              <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${colour.dot}`} />
              <span className="text-xs text-[rgba(245,245,242,0.6)] group-hover:text-[rgba(245,245,242,0.9)] transition-colors w-24 shrink-0 truncate">
                {cat.short}
              </span>
              <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${colour.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="shrink-0 text-xs font-mono text-[rgba(245,245,242,0.35)] w-5 text-right">
                {count}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
