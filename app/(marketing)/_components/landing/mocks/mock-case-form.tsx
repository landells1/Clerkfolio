import { WindowChrome } from './window-chrome'

const input = 'h-[38px] rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3.5 py-2 text-xs text-ink'

export function MockCaseForm({ className = '' }: { className?: string }) {
  return (
    <WindowChrome url="clerkfolio.co.uk/cases/new" className={className} contentClassName="p-5">
      <p className="mb-3 text-[11px] text-ink-dim">← Back to cases</p>
      <h3 className="mb-5 text-[19px] font-semibold">Log case</h3>
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-soft">Case title *</span>
          <span className={`block ${input}`}>DKA in newly-diagnosed T1DM</span>
          <span className="mt-1.5 block text-[11px] text-ink-dim">Do not include patient names, dates of birth, or NHS numbers.</span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">Date</span>
            <span className={`block font-mono ${input}`}>14/03/2026</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">Application tags</span>
            <span className={`block ${input}`}><span className="rounded bg-blue-500/10 px-2 py-1 text-blue-400">IMT ×</span></span>
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-soft">Clinical area</span>
          <span className={`block ${input}`}><span className="rounded bg-cyan-500/15 px-2 py-1 text-cyan-400">Acute medicine ×</span> <span className="text-ink-dim">Select clinical areas...</span></span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-soft">Notes</span>
          <span className="block h-[92px] rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3.5 py-2 text-xs leading-5 text-ink-soft">
            Presented with ketones, acidosis and dehydration. Managed with fluids, fixed-rate insulin infusion and potassium replacement under senior review.
          </span>
        </label>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/[0.08] pt-4">
        <button className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-ink-soft">Cancel</button>
        <button className="col-span-2 rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-white">Save case</button>
      </div>
    </WindowChrome>
  )
}
