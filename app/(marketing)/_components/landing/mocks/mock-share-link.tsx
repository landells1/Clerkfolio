import { WindowChrome } from './window-chrome'

export function MockShareLink({ className = '' }: { className?: string }) {
  return (
    <WindowChrome url="clerkfolio.co.uk/export" className={className} contentClassName="p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.02em]">Export & share</h3>
          <p className="text-xs text-ink-dim">Build application-ready packs or protected links.</p>
        </div>
        <div className="flex rounded-lg border border-white/[0.08] bg-[#0B0B0C] p-1 font-mono text-[10px] text-ink-dim">
          <span className="px-2 py-1">Application PDF</span>
          <span className="px-2 py-1">Data backup</span>
          <span className="rounded bg-blue-500 px-2 py-1 text-white">Share links</span>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0C] p-4">
          <h4 className="mb-3 text-sm font-medium">Create protected link</h4>
          <div className="space-y-3 text-xs">
            <Field label="Scope" value="Current specialty ▾" />
            <div>
              <p className="mb-1.5 text-ink-dim">Expires</p>
              <div className="grid grid-cols-2 gap-1.5">
                {['1 day', '1 week', '1 month', 'Custom'].map((item) => (
                  <span key={item} className={`rounded border px-2 py-2 text-center ${item === '1 month' ? 'border-blue-500/40 bg-blue-500/10 text-[#6AA8FF]' : 'border-white/[0.08] text-ink-soft'}`}>{item}</span>
                ))}
              </div>
            </div>
            <Field label="PIN" value="••••" mono />
            <button className="w-full rounded-lg bg-blue-500 px-3 py-2.5 text-xs font-semibold text-white">Create link</button>
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0C] p-4">
          <h4 className="mb-3 text-sm font-medium">Active links</h4>
          <div className="space-y-2">
            <LinkRow title="Internal Medicine Training" meta="Expires 13 May 2026 · 4 views" />
            <LinkRow title="Theme: leadership" meta="Expires 6 May 2026 · 1 view" />
          </div>
        </div>
      </div>
    </WindowChrome>
  )
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-ink-dim">{label}</span>
      <span className={`block rounded-lg border border-white/[0.08] bg-[#141416] px-3 py-2 text-ink ${mono ? 'font-mono' : ''}`}>{value}</span>
    </label>
  )
}

function LinkRow({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#141416] p-3">
      <div className="text-xs font-medium">{title}</div>
      <div className="mt-1 font-mono text-[10px] text-ink-dim">{meta}</div>
      <div className="mt-2 flex gap-1.5">
        <button className="rounded border border-white/[0.08] px-2 py-1 text-[10px] text-ink-soft">Copy</button>
        <button className="rounded border border-white/[0.08] px-2 py-1 text-[10px] text-ink-soft">Renew</button>
        <button className="rounded border border-red-500/30 px-2 py-1 text-[10px] text-red-300">Revoke</button>
      </div>
    </div>
  )
}
