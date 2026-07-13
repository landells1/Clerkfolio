import { WindowChrome } from './window-chrome'

const tabs = ['Import', 'Application PDF', 'Data backup', 'Share links', 'Files']

export function MockExport({ className = '' }: { className?: string }) {
  return (
    <WindowChrome
      url="clerkfolio.co.uk/export"
      label="Illustrative Clerkfolio Import and export page with the Application PDF tab selected"
      className={className}
      contentClassName="p-4 sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.02em]">Import &amp; export</h3>
          <p className="text-xs text-ink-dim">Generate an application pack or keep a copy of your records.</p>
        </div>
        <div className="flex flex-wrap rounded-lg border border-default bg-[var(--bg-canvas)] p-1 font-mono text-[10px] text-ink-dim">
          {tabs.map((tab) => (
            <span key={tab} className={tab === 'Application PDF' ? 'rounded bg-[var(--button-primary-bg)] px-2 py-1 text-[var(--button-primary-text)]' : 'px-2 py-1'}>{tab}</span>
          ))}
        </div>
      </div>
      <div className="mb-3 rounded-lg border border-default bg-[var(--bg-canvas)] px-3 py-2 text-xs text-ink-soft">
        <span className="mr-2 font-medium text-ink">Target specialty</span>
        Internal Medicine Training
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[150px_minmax(0,1fr)]">
        <div className="rounded-xl border border-default bg-[var(--bg-canvas)] p-3">
          <p className="mb-2 text-xs font-medium text-ink">Format</p>
          <div className="space-y-1.5 text-xs">
            <p className="rounded border border-accent/30 bg-[var(--accent-soft)] px-2 py-1.5 text-[var(--accent-soft-text)]">PDF</p>
            <p className="px-2 py-1.5 text-ink-dim">CSV</p>
            <p className="px-2 py-1.5 text-ink-dim">JSON</p>
          </div>
        </div>
        <div className="rounded-xl border border-default bg-[var(--bg-canvas)] p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-medium">Application PDF</h4>
              <p className="text-[11px] text-ink-dim">23 portfolio entries selected</p>
            </div>
            <span className="rounded-lg bg-[var(--button-primary-bg)] px-3 py-2 text-xs font-semibold text-[var(--button-primary-text)]">Export PDF</span>
          </div>
          <div className="mt-3 space-y-1.5">
            {['VTE prophylaxis on AAU - re-audit', 'ABG interpretation for new F1s', 'Teaching feedback summary'].map((entry) => (
              <div key={entry} className="rounded-lg border border-default bg-[var(--bg-surface)] px-2.5 py-2 text-xs text-ink-soft">{entry}</div>
            ))}
          </div>
        </div>
      </div>
    </WindowChrome>
  )
}
