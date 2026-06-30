'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useToast } from '@/components/ui/toast-provider'
import { apiFetch } from '@/lib/api-fetch'

export default function DemoStarterCard({ show }: { show: boolean }) {
  const router = useRouter()
  const { addToast } = useToast()
  const [busy, setBusy] = useState<null | 'remove' | 'dismiss'>(null)
  if (!show) return null

  async function removeDemos() {
    setBusy('remove')
    const res = await apiFetch('/api/onboarding/demos', { method: 'DELETE' })
    setBusy(null)
    if (!res.ok) {
      addToast('Could not remove sample data', 'error')
      return
    }
    addToast('Sample data removed', 'success')
    router.refresh()
  }

  async function dismiss() {
    setBusy('dismiss')
    const res = await apiFetch('/api/onboarding/demos', { method: 'POST' })
    setBusy(null)
    if (!res.ok) {
      addToast('Could not dismiss', 'error')
      return
    }
    router.refresh()
  }

  return (
    <div className="mb-6 rounded-2xl border border-accent/25 bg-accent/10 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">These are example entries</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            A demo case and demo audit (labelled “edit me”) show you how entries work. Edit them into
            your own, or clear them.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={dismiss}
            disabled={busy !== null}
            className="min-h-[40px] rounded-xl px-4 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            {busy === 'dismiss' ? 'Hiding...' : 'Keep & hide'}
          </button>
          <button
            onClick={removeDemos}
            disabled={busy !== null}
            className="min-h-[40px] rounded-xl border border-white/[0.08] px-4 text-sm font-medium text-[var(--text-primary)] transition-colors hover:border-white/[0.15] disabled:opacity-50"
          >
            {busy === 'remove' ? 'Removing...' : 'Remove sample data'}
          </button>
        </div>
      </div>
    </div>
  )
}
