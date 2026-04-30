import { getSpecialtyConfig } from '@/lib/specialties'
import { DomainPill, SpecialtyPill, StatusDot } from './pills'
import { MockSidebar } from './mock-sidebar'
import { WindowChrome } from './window-chrome'

const imt = getSpecialtyConfig('imt_2026')?.name ?? 'IMT'
const cst = getSpecialtyConfig('cst_2026')?.name ?? 'CST'

const cases = [
  {
    title: 'DKA in newly-diagnosed T1DM',
    domains: ['Acute medicine'],
    tags: [imt],
    date: '14 Mar 2026',
    notes: 'Presented with ketones and acidosis. Fluids, insulin infusion and potassium replacement.',
    pinned: true,
    status: 'green',
  },
  {
    title: 'STEMI - anterior, primary PCI',
    domains: ['Cardiology'],
    tags: [imt],
    date: '8 Mar 2026',
    notes: 'Door-to-balloon 38 min. Followed up on CCU after transfer.',
    pinned: false,
    status: 'green',
  },
  {
    title: 'Lap chole - first assistant',
    domains: ['General surgery'],
    tags: [cst],
    date: '2 Mar 2026',
    notes: 'Elective list. Documented role, supervision and key learning points.',
    pinned: false,
    status: 'amber',
  },
  {
    title: 'Acute LVF in CKD-4',
    domains: ['Cardiology', 'Renal'],
    tags: [imt],
    date: '24 Feb 2026',
    notes: 'Managed fluid balance and escalation plan with senior review.',
    pinned: false,
    status: 'green',
  },
] as const

export function MockCasesList({ className = '' }: { className?: string }) {
  return (
    <WindowChrome url="clerkfolio.co.uk/cases" className={className} contentClassName="flex h-full min-h-[420px]">
      <MockSidebar active="Cases" />
      <main className="min-w-0 flex-1 p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold tracking-[-0.02em]">Cases</h3>
            <p className="text-xs text-ink-dim">23 cases logged</p>
          </div>
          <button className="rounded-md bg-blue-500 px-3 py-2 text-xs font-semibold text-white">+ Log case</button>
        </div>
        <p className="mb-3 font-mono text-[11px] text-ink-dim">9 Acute medicine · 5 Cardiology · 4 General surgery · 3 Renal</p>
        <div className="mb-3 rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3.5 py-2.5 text-xs leading-5 text-ink-soft">
          All case entries must be anonymised. Do not include patient names, dates of birth or NHS numbers.
        </div>
        <div className="space-y-2.5">
          {cases.map((item) => (
            <article key={item.title} className="rounded-xl border border-white/[0.06] bg-[#141416] p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {item.pinned ? <span className="text-[10px] text-ink-dim">◆</span> : null}
                    {item.domains.map((domain) => <DomainPill key={domain}>{domain}</DomainPill>)}
                    {item.tags.map((tag) => <SpecialtyPill key={tag}>{tag}</SpecialtyPill>)}
                  </div>
                  <h4 className="truncate text-sm font-medium text-ink">{item.title}</h4>
                  <p className="mt-0.5 truncate text-xs text-ink-dim">{item.notes}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="font-mono text-xs text-ink-dim">{item.date}</span>
                  <StatusDot status={item.status} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </WindowChrome>
  )
}
