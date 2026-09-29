'use client'

import { useId, useRef } from 'react'
import { useFocusTrap } from '@/lib/hooks/use-focus-trap'

export function ConfirmModal({
  title,
  body,
  confirmLabel,
  busyLabel,
  busy = false,
  danger,
  confirmationText,
  onConfirmationTextChange,
  confirmationRequired,
  passwordValue,
  onPasswordChange,
  passwordRequired,
  onCancel,
  onConfirm,
}: {
  title: string
  body: string
  confirmLabel: string
  /** Shown on the confirm button while `busy` (e.g. "Deleting..."). */
  busyLabel?: string
  /** Disables both buttons and Esc while the action runs, so a double click
   *  can't fire a second request (account deletion takes a few seconds). */
  busy?: boolean
  danger?: boolean
  confirmationText?: string
  onConfirmationTextChange?: (value: string) => void
  confirmationRequired?: string
  passwordValue?: string
  onPasswordChange?: (value: string) => void
  passwordRequired?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const bodyId = useId()
  useFocusTrap(true, dialogRef, () => { if (!busy) onCancel() })

  const textGate = confirmationRequired != null && confirmationText !== confirmationRequired
  const passwordGate = passwordRequired === true && (!passwordValue || passwordValue.length === 0)
  const disabled = textGate || passwordGate || busy

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        className="w-full sm:max-w-md mx-auto bg-[var(--bg-surface)] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl p-6 outline-none"
      >
        <h2 id={titleId} className="text-lg font-semibold text-[var(--text-primary)] mb-2">{title}</h2>
        <p id={bodyId} className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">{body}</p>
        {confirmationRequired && (
          <input
            value={confirmationText ?? ''}
            onChange={e => onConfirmationTextChange?.(e.target.value)}
            placeholder={confirmationRequired}
            aria-label={`Type ${confirmationRequired} to confirm`}
            disabled={busy}
            className="mb-4 w-full min-h-[44px] rounded-lg border border-red-500/20 bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-red-400"
          />
        )}
        {passwordRequired && (
          <input
            type="password"
            autoComplete="current-password"
            value={passwordValue ?? ''}
            onChange={e => onPasswordChange?.(e.target.value)}
            placeholder="Current password"
            aria-label="Current password"
            disabled={busy}
            className="mb-4 w-full min-h-[44px] rounded-lg border border-red-500/20 bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-red-400"
          />
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="min-h-[44px] flex-1 border border-white/[0.08] text-[var(--text-secondary)] rounded-lg px-4 py-2.5 text-sm disabled:opacity-40">
            Cancel
          </button>
          <button type="button" disabled={disabled} onClick={onConfirm} className={`min-h-[44px] flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-40 ${danger ? 'bg-red-500 text-[var(--button-primary-text)]' : 'bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]'}`}>
            {busy ? (busyLabel ?? 'Working...') : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
