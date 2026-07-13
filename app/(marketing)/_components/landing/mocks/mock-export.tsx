import { WindowChrome } from './window-chrome'

const exports = [
  ['Application PDF', 'Selected portfolio evidence in an application-ready pack'],
  ['CSV records', 'Portable rows for your own analysis or archive'],
  ['JSON data', 'A structured copy of your Clerkfolio records'],
  ['Full ZIP backup', 'Records and uploaded evidence in one download'],
] as const

export function MockExport({ className = '' }: { className?: string }) {
  return (
    <WindowChrome
      url="clerkfolio.co.uk/export"
      label="Illustrative Clerkfolio export screen with application PDF, CSV, JSON, ZIP backup and PIN-protected portfolio sharing"
      className={className}
      contentClassName="p-4 sm:p-5"
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold tracking-[-0.02em]">Import &amp; export</h3>
        <p className="text-xs text-ink-dim">Build a focused pack, keep a backup or share selected portfolio evidence.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {exports.map(([title, description]) => (
            <div key={title} className="rounded-xl border border-default bg-[var(--bg-canvas)] p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-xs font-medium text-ink">{title}</h4>
                  <p className="mt-1 text-[11px] leading-5 text-ink-dim">{description}</p>
                </div>
                <span className="shrink-0 rounded border border-default px-2 py-1 font-mono text-[9px] uppercase text-accent">Export</span>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-accent/30 bg-[var(--accent-soft)] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-accent">Protected share link</p>
          <h4 className="mt-2 text-sm font-medium text-ink">Internal Medicine Training</h4>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-[var(--bg-surface)] p-2.5">
              <dt className="text-ink-dim">Scope</dt>
              <dd className="mt-1 text-ink">Portfolio entries</dd>
            </div>
            <div className="rounded-lg bg-[var(--bg-surface)] p-2.5">
              <dt className="text-ink-dim">Expires</dt>
              <dd className="mt-1 text-ink">30 days</dd>
            </div>
            <div className="rounded-lg bg-[var(--bg-surface)] p-2.5">
              <dt className="text-ink-dim">Required PIN</dt>
              <dd className="mt-1 font-mono text-ink">••••</dd>
            </div>
            <div className="rounded-lg bg-[var(--bg-surface)] p-2.5">
              <dt className="text-ink-dim">Case entries</dt>
              <dd className="mt-1 text-ink">Never included</dd>
            </div>
          </dl>
        </div>
      </div>
    </WindowChrome>
  )
}
