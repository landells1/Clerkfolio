'use client'

import { useId, useRef, useState, type ReactNode } from 'react'
import { useFocusTrap } from '@/lib/hooks/use-focus-trap'

// In-app confirmation dialog. Use this instead of window.confirm(): a native
// confirm blocks the page's main thread (an unanswered one froze the edit page
// in QA, and automated browsers dismiss them silently), it cannot be styled
// for either theme, and it gives no room to explain consequences.
//
// Controlled: render it with `open` and handle `onConfirm` / `onCancel`.
// `onConfirm` may be async; the confirm button shows `busyLabel` while it runs.
// `requireText` adds a type-to-confirm box for the strongest confirmations.
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  busyLabel = 'Working...',
  cancelLabel = 'Cancel',
  tone = 'default',
  requireText,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  children?: ReactNode
  confirmLabel: string
  busyLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  requireText?: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const [busy, setBusy] = useState(false)
  const [typed, setTyped] = useState('')
  useFocusTrap(open, ref, () => { if (!busy) close() })

  if (!open) return null

  function close() {
    setTyped('')
    onCancel()
  }

  async function confirm() {
    if (busy) return
    if (requireText && typed.trim() !== requireText) return
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
      setTyped('')
    }
  }

  const confirmDisabled = busy || Boolean(requireText && typed.trim() !== requireText)
  const confirmClass = tone === 'danger'
    ? 'bg-[var(--danger)] text-white hover:opacity-90'
    : 'bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] hover:bg-[var(--button-primary-bg-hover)]'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={event => { if (event.target === event.currentTarget && !busy) close() }}
    >
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-md rounded-t-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-lg outline-none sm:rounded-2xl"
      >
        <h2 id={titleId} className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
        {children && <div className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--text-secondary)]">{children}</div>}
        {requireText && (
          <label className="mt-4 block text-xs font-medium text-[var(--text-secondary)]">
            Type {requireText} to confirm
            <input
              value={typed}
              onChange={event => setTyped(event.target.value)}
              autoComplete="off"
              className="mt-1.5 w-full min-h-[44px] rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          </label>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="min-h-[44px] flex-1 rounded-lg border border-[var(--border-default)] px-4 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={confirmDisabled}
            className={`min-h-[44px] flex-1 rounded-lg px-4 text-sm font-semibold transition-colors disabled:opacity-40 ${confirmClass}`}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
