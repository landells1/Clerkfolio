'use client'

export function ConfirmModal({
  title,
  body,
  confirmLabel,
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
  const textGate = confirmationRequired != null && confirmationText !== confirmationRequired
  const passwordGate = passwordRequired === true && (!passwordValue || passwordValue.length === 0)
  const disabled = textGate || passwordGate

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="w-full sm:max-w-md mx-auto bg-[var(--bg-surface)] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{title}</h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">{body}</p>
        {confirmationRequired && (
          <input
            value={confirmationText ?? ''}
            onChange={e => onConfirmationTextChange?.(e.target.value)}
            placeholder={confirmationRequired}
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
            className="mb-4 w-full min-h-[44px] rounded-lg border border-red-500/20 bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-red-400"
          />
        )}
        <div className="flex gap-2">
          <button onClick={onCancel} className="min-h-[44px] flex-1 border border-white/[0.08] text-[var(--text-secondary)] rounded-lg px-4 py-2.5 text-sm">
            Cancel
          </button>
          <button disabled={disabled} onClick={onConfirm} className={`min-h-[44px] flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-40 ${danger ? 'bg-red-500 text-[var(--button-primary-text)]' : 'bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
