'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useToast } from '@/components/ui/toast-provider'

export default function DemoStarterCard({ show }: { show: boolean }) {
  const router = useRouter()
  const { addToast } = useToast()
  const [busy, setBusy] = useState<null | 'remove' | 'dismiss'>(null)
  if (!show) return null

  async function removeDemos() {
    setBusy('remove')
    const res = await fetch('/api/onboarding/demos', { method: 'DELETE' })
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
    const res = await fetch('/api/onboarding/demos', { method: 'POST' })
    setBusy(null)
    if (!res.ok) {
      addToast('Could not dismiss', 'error')
      return
    }
    router.refresh()
  }

  return (
    <div className="mb-6 rounded-2xl border border-[#1B6FD9]/25 bg-[#1B6FD9]/10 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#F5F5F2]">These are example entries</h2>
          <p className="mt-1 text-sm text-[rgba(245,245,242,0.6)]">
            A demo case and demo audit (labelled “edit me”) show you how entries work. Edit them into
            your own, or clear them.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={dismiss}
            disabled={busy !== null}
            className="min-h-[40px] rounded-xl px-4 text-sm font-medium text-[rgba(245,245,242,0.7)] transition-colors hover:text-[#F5F5F2] disabled:opacity-50"
          >
            {busy === 'dismiss' ? 'Hiding...' : 'Keep & hide'}
          </button>
          <button
            onClick={removeDemos}
            disabled={busy !== null}
            className="min-h-[40px] rounded-xl border border-white/[0.08] px-4 text-sm font-medium text-[#F5F5F2] transition-colors hover:border-white/[0.15] disabled:opacity-50"
          >
            {busy === 'remove' ? 'Removing...' : 'Remove sample data'}
          </button>
        </div>
      </div>
    </div>
  )
}
