'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Props = {
  applicationId: string
  specialtyLabel: string
  // ISO date of the next application deadline, or null if no deadline plumbed in.
  deadline: string | null
}

// Banner shown at the top of the dashboard when the user has marked a specialty
// as their application target (specialty_applications.is_target). Surfaces
// weeks-to-deadline as a passive countdown - it does not reorder anything else
// on the page (per product constraint: no advice / no algorithmic ranking).
//
// Dismiss = clear is_target on the row. The user can re-enable from the
// specialty tracker.
export default function ApplicationModeBanner({ applicationId, specialtyLabel, deadline }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const weeksRemaining = (() => {
    if (!deadline) return null
    const ms = new Date(deadline).getTime() - Date.now()
    if (Number.isNaN(ms) || ms < 0) return 0
    return Math.max(0, Math.round(ms / (7 * 24 * 60 * 60 * 1000)))
  })()

  async function dismiss() {
    if (busy) return
    setBusy(true)
    await supabase
      .from('specialty_applications')
      .update({ is_target: false })
      .eq('id', applicationId)
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-pill-amber bg-pill-amber px-5 py-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-amber-500/20 text-amber-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg leading-tight">
            Application mode: <span className="text-amber-300">{specialtyLabel}</span>
          </p>
          <p className="mt-0.5 text-xs text-fg-2">
            {weeksRemaining === null
              ? 'No deadline set yet. Add one on Timeline.'
              : weeksRemaining === 0
              ? 'Deadline reached. Update on Timeline.'
              : `${weeksRemaining} ${weeksRemaining === 1 ? 'week' : 'weeks'} until your next deadline.`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/specialties"
          className="inline-flex h-9 items-center rounded-lg border border-default bg-surface-2 px-3 text-xs font-medium text-fg hover:bg-surface-3 transition-colors"
        >
          Open tracker
        </Link>
        <button
          type="button"
          onClick={dismiss}
          disabled={busy}
          className="inline-flex h-9 items-center rounded-lg px-3 text-xs font-medium text-fg-2 hover:text-fg transition-colors disabled:opacity-50"
          aria-label="Dismiss application mode"
        >
          {busy ? 'Dismissing...' : 'Dismiss'}
        </button>
      </div>
    </div>
  )
}
