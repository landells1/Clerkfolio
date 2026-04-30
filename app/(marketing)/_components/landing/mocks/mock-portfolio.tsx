import { CATEGORIES, CATEGORY_COLOURS, type Category } from '@/lib/types/portfolio'
import { getSpecialtyConfig } from '@/lib/specialties'
import { SpecialtyPill, StatusDot } from './pills'
import { MockSidebar } from './mock-sidebar'
import { WindowChrome } from './window-chrome'

const imt = getSpecialtyConfig('imt_2026')?.name ?? 'IMT'

const entries: { code: string; category: Category; title: string; sub: string; date: string; status: 'green' | 'amber' }[] = [
  { code: 'AUD', category: 'audit_qip', title: 'VTE prophylaxis on AAU - re-audit', sub: 'CYCLE 2 - Royal London', date: '11 Mar 2026', status: 'green' },
  { code: 'TCH', category: 'teaching', title: 'ABG interpretation for new F1s', sub: 'small group - induction week', date: '5 Mar 2026', status: 'green' },
  { code: 'PUB', category: 'publication', title: 'Letter - junior-led handover redesign', sub: 'letter - published', date: '28 Feb 2026', status: 'green' },
  { code: 'REF', category: 'reflection', title: 'Reflection - escalation when uncertain', sub: 'CRITICAL-INCIDENT', date: '24 Feb 2026', status: 'amber' },
  { code: 'PROC', category: 'procedure', title: 'Lumbar puncture, USS-guided', sub: 'Indirect supervision', date: '18 Feb 2026', status: 'green' },
]

const filters = [
  'All 62',
  ...CATEGORIES.filter((category) => category.value !== 'custom').map((category, index) => {
    const counts = [9, 11, 7, 4, 6, 3, 8, 14]
    return `${category.short === 'Audit' ? 'Audit / QIP' : category.short} ${counts[index]}`
  }),
]

export function MockPortfolio({ className = '' }: { className?: string }) {
  return (
    <WindowChrome url="clerkfolio.co.uk/portfolio" className={className} contentClassName="flex h-full min-h-[420px]">
      <MockSidebar active="Portfolio" />
      <main className="min-w-0 flex-1 p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold tracking-[-0.02em]">Portfolio</h3>
            <p className="text-xs text-ink-dim">62 entries across 8 categories</p>
          </div>
          <button className="rounded-md bg-blue-500 px-3 py-2 text-xs font-semibold text-white">+ New entry</button>
        </div>
        <div className="mb-3 flex gap-1.5 overflow-hidden">
          {filters.map((filter) => {
            const active = filter.startsWith('Reflection')
            return (
              <span key={filter} className={`shrink-0 rounded border px-2 py-1 font-mono text-[10px] ${active ? 'border-blue-500/40 bg-blue-500/10 text-[#6AA8FF]' : 'border-white/[0.08] text-ink-dim'}`}>
                {filter}
              </span>
            )
          })}
        </div>
        <div className="space-y-2">
          {entries.map((entry) => {
            const colours = CATEGORY_COLOURS[entry.category]
            return (
              <article key={entry.title} className="rounded-xl border border-white/[0.06] bg-[#141416] p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-medium ${colours.badge}`}>{entry.code}</span>
                      <SpecialtyPill>{imt}</SpecialtyPill>
                    </div>
                    <h4 className="truncate text-sm font-medium text-ink">{entry.title}</h4>
                    <p className="mt-0.5 truncate text-xs text-ink-dim">{entry.sub}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="font-mono text-xs text-ink-dim">{entry.date}</span>
                    <StatusDot status={entry.status} />
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </main>
    </WindowChrome>
  )
}
