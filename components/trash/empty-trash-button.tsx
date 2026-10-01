'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast-provider'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { apiFetch, NETWORK_ERROR_MESSAGE } from '@/lib/api-fetch'
import { countLabel } from '@/lib/utils/plural'

// "Empty trash": permanently deletes EVERYTHING currently in Trash, straight
// away, via the owner-checked server route (POST /api/trash/purge). Guarded by
// a type-EMPTY confirmation because it cannot be undone. The nightly 30-day
// auto-purge is separate and unchanged.
export default function EmptyTrashButton({ itemCount }: { itemCount: number }) {
  const router = useRouter()
  const { addToast } = useToast()
  const [open, setOpen] = useState(false)

  async function emptyTrash() {
    const { ok, status, data } = await apiFetch<{ purged?: { entries: number; cases: number; logs: number }; error?: string }>('/api/trash/purge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    if (!ok) {
      addToast(status === null ? NETWORK_ERROR_MESSAGE : (data?.error ?? 'Could not empty trash'), 'error')
      router.refresh()
      return
    }
    const purged = data?.purged
    const total = purged ? purged.entries + purged.cases + purged.logs : 0
    addToast(`${countLabel(total, 'item')} deleted permanently`, 'success')
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <div className="sm:max-w-[260px]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={itemCount === 0}
          className="min-h-[44px] w-full rounded-xl border border-[var(--danger)] px-4 text-sm font-medium text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Empty trash
        </button>
      </div>
      <ConfirmDialog
        open={open}
        title="Empty trash?"
        confirmLabel="Delete everything permanently"
        busyLabel="Emptying..."
        tone="danger"
        requireText="EMPTY"
        onConfirm={emptyTrash}
        onCancel={() => setOpen(false)}
      >
        <p>
          {itemCount === 1 ? 'This permanently deletes the 1 item in Trash now' : `This permanently deletes all ${itemCount} items in Trash now`}
          , including anything deleted in the last 30 days. Nothing can be restored afterwards.
        </p>
        <p>Evidence files attached to those entries and cases are deleted too, unless the same file is still attached to another entry or case - those files are kept.</p>
      </ConfirmDialog>
    </>
  )
}
