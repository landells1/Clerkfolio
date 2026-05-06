'use client'

const SHORTCUTS = [
  ['Cmd/Ctrl K', 'Open command launcher'],
  ['g d', 'Go to dashboard'],
  ['g p', 'Go to portfolio'],
  ['g c', 'Go to cases'],
  ['g s', 'Go to specialties'],
  ['n', 'New quick log'],
  ['?', 'Keyboard shortcuts'],
]

export default function Cheatsheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/60 px-4 pt-[18vh] backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#141416] p-5 shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#F5F5F2]">Keyboard shortcuts</h2>
          <button onClick={onClose} className="text-sm text-[rgba(245,245,242,0.45)] hover:text-[#F5F5F2]">Close</button>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {SHORTCUTS.map(([keys, label]) => (
            <div key={keys} className="flex min-h-[44px] items-center justify-between gap-4 py-2">
              <span className="text-sm text-[rgba(245,245,242,0.68)]">{label}</span>
              <kbd className="rounded border border-white/[0.08] bg-white/[0.06] px-2 py-1 text-xs text-[rgba(245,245,242,0.65)]">{keys}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
