'use client'

import type { Dispatch, SetStateAction } from 'react'

export type PasswordForm = { current: string; next: string; confirm: string }

export function PasswordSection({
  passwordForm,
  setPasswordForm,
  passwordLoading,
  onSubmit,
}: {
  passwordForm: PasswordForm
  setPasswordForm: Dispatch<SetStateAction<PasswordForm>>
  passwordLoading: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <section className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-6 mb-6">
      <h2 className="text-base font-semibold text-[var(--text-primary)] mb-5">Password</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <input type="password" autoComplete="current-password" placeholder="Current password" value={passwordForm.current} onChange={e => setPasswordForm(f => ({ ...f, current: e.target.value }))} className="w-full min-h-[44px] bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)]" />
        <input type="password" autoComplete="new-password" placeholder="New password" value={passwordForm.next} onChange={e => setPasswordForm(f => ({ ...f, next: e.target.value }))} className="w-full min-h-[44px] bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)]" />
        <input type="password" autoComplete="new-password" placeholder="Confirm new password" value={passwordForm.confirm} onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))} className="w-full min-h-[44px] bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)]" />
        <button disabled={passwordLoading} className="min-h-[44px] bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-50 text-[var(--button-primary-text)] font-semibold rounded-lg px-5 py-2.5 text-sm">
          {passwordLoading ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </section>
  )
}
