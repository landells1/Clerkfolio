'use client'

import { useRef } from 'react'
import { useFocusTrap } from '@/lib/hooks/use-focus-trap'

// Keep in step with the keydown handler in app/(dashboard)/providers.tsx.
const SHORTCUTS = [
  ['Cmd/Ctrl K', 'Open command launcher'],
  ['g d', 'Go to dashboard'],
  ['g p', 'Go to portfolio'],
  ['g c', 'Go to cases'],
  ['g s', 'Go to specialties'],
  ['g t', 'Go to timeline'],
  ['g a', 'Go to ARCP'],
  ['g e', 'Go to import & export'],
  ['g i', 'Go to import'],
  ['g r', 'Go to rotations & training'],
  ['g x', 'Go to settings'],
  ['n', 'New quick log'],
  ['c', 'New case'],
  ['?', 'Keyboard shortcuts'],
]

export default function Cheatsheet({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  // Focus moves into the dialog, Tab stays inside it and Esc closes it.
  useFocusTrap(true, dialogRef, onClose)
  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cheatsheet-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[var(--bg-surface)] p-5 shadow-2xl outline-none"
        onClick={event => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="cheatsheet-title" className="text-base font-semibold text-[var(--text-primary)]">Keyboard shortcuts</h2>
          <button type="button" onClick={onClose} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">Close</button>
        </div>
        <div className="max-h-[60vh] divide-y divide-white/[0.06] overflow-y-auto">
          {SHORTCUTS.map(([keys, label]) => (
            <div key={keys} className="flex min-h-[40px] items-center justify-between gap-4 py-1.5">
              <span className="text-sm text-[var(--text-secondary)]">{label}</span>
              <kbd className="rounded border border-white/[0.08] bg-white/[0.06] px-2 py-1 text-xs text-[var(--text-secondary)]">{keys}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
