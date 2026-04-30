import { getSpecialtyConfig } from '@/lib/specialties'
import { MockSidebar } from './mock-sidebar'
import { WindowChrome } from './window-chrome'

const config = getSpecialtyConfig('imt_2026')
const specialtyName = config?.name ?? 'Internal Medicine Training'

const rows = [
  ['Quality improvement project completed', '✓', '2 / 1 linked', true, false],
  ['Audit cycle, closed loop', '✓', '1 / 1 linked', true, false],
  ['Teaching qualification or formal course', '☐', '0 / 1 linked', false, true],
  ['Leadership / management role', '✓', '1 / 1 linked', true, false],
  ['Publication, first author', '✓', '1 / 1 linked', true, false],
  ['Poster or oral presentation, regional+', '☐', '0 / 1 linked', false, false],
  ['Additional degree / postgraduate qualification', '☐', '0 / 1 linked', false, false],
  ['Commitment to specialty - evidence', '✓', '4 / 1 linked', true, false],
] as const

export function MockChecklist({ className = '' }: { className?: string }) {
  return (
    <WindowChrome url="clerkfolio.co.uk/specialties/imt" className={className} contentClassName="flex h-full min-h-[420px]">
      <MockSidebar active="Specialties" />
      <main className="min-w-0 flex-1 p-4 sm:p-5">
        <p className="mb-2 text-[11px] text-ink-dim">← Specialties</p>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold tracking-[-0.02em]">{specialtyName}</h3>
            <p className="text-xs text-ink-dim">Application evidence mapped against self-assessment domains.</p>
          </div>
          <div className="min-w-[180px]">
            <div className="mb-1 flex justify-between font-mono text-[11px] text-ink-dim"><span>Progress</span><span className="text-ink">5 / 8 domains evidenced</span></div>
            <div className="h-1.5 rounded-full bg-white/[0.08]"><div className="h-full w-[62%] rounded-full bg-blue-500" /></div>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#141416]">
          {rows.map(([domain, box, evidence, done, priority]) => (
            <div key={domain} className="grid grid-cols-[20px_1fr_auto] items-center gap-3 border-b border-white/[0.04] px-3 py-2.5 last:border-b-0">
              <span className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${done ? 'border-blue-500 bg-blue-500 text-surface' : 'border-white/[0.18] text-ink-dim'}`}>{box}</span>
              <div className="min-w-0">
                <span className="block truncate text-xs text-ink-soft">{domain}</span>
                {priority ? <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-amber-400">Priority</span> : null}
              </div>
              <span className={`font-mono text-[10px] ${done ? 'text-emerald-400' : 'text-ink-dim'}`}>{evidence}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-5 text-ink-dim">Tap a domain to link a portfolio entry, audit, teaching session, or reflection as evidence.</p>
      </main>
    </WindowChrome>
  )
}
