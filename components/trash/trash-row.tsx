'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast-provider'
import SwipeToDelete from '@/components/ui/swipe-to-delete'
import TrashActions from '@/components/trash/trash-actions'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { apiFetch, NETWORK_ERROR_MESSAGE } from '@/lib/api-fetch'

export type TrashItem = {
  id: string
  title: string
  subtitle: string
  category: string | null
  date: string
  deletedAt: string
  type: 'entry' | 'case' | 'log'
}

export default function TrashRow({ item }: { item: TrashItem }) {
  const router = useRouter()
  const { addToast } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const autoPurgeAt = new Date(new Date(item.deletedAt).getTime() + 30 * 86_400_000)
  const deletedDate = new Date(item.deletedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const entryDate = new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const autoPurgeDate = autoPurgeAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const typeLabel = item.type === 'entry' ? 'Portfolio' : item.type === 'log' ? 'Log' : 'Case'
  const noun = item.type === 'entry' ? 'entry' : item.type === 'log' ? 'log entry' : 'case'

  // Server-side, owner-checked hard delete (POST /api/trash/purge). Available
  // straight away - the 30-day window is only when the nightly auto-purge
  // runs, not a lock on deleting something yourself.
  async function permanentlyDelete() {
    const { ok, status, data } = await apiFetch<{ error?: string }>('/api/trash/purge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: item.id, type: item.type }] }),
    })
    if (!ok) {
      addToast(status === null ? NETWORK_ERROR_MESSAGE : (data?.error ?? 'Failed to delete item permanently'), 'error')
      return
    }
    setConfirmOpen(false)
    addToast('Deleted permanently', 'success')
    router.refresh()
  }

  return (
    <>
      <SwipeToDelete
        title="Delete permanently?"
        description={`This permanently deletes "${item.title}" now. It cannot be restored.`}
        confirmLabel="Delete permanently"
        onConfirm={permanentlyDelete}
      >
        <div className="flex flex-col gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-md border border-[var(--border-default)] bg-[var(--bg-overlay-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                {typeLabel}
              </span>
              <p className="truncate text-sm text-[var(--text-primary)]">{item.title}</p>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              <span className="capitalize">{item.subtitle}</span> - {entryDate} - Deleted {deletedDate} - Removed automatically after {autoPurgeDate}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <TrashActions id={item.id} type={item.type} />
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="min-h-[36px] text-xs font-medium text-[var(--danger)] underline-offset-2 hover:underline"
            >
              Delete permanently now
            </button>
          </div>
        </div>
      </SwipeToDelete>
      <ConfirmDialog
        open={confirmOpen}
        title={`Delete "${item.title}" permanently?`}
        confirmLabel="Delete permanently"
        busyLabel="Deleting..."
        tone="danger"
        onConfirm={permanentlyDelete}
        onCancel={() => setConfirmOpen(false)}
      >
        <p>This deletes the {noun} now. It cannot be restored afterwards.</p>
        {item.type !== 'log' && (
          <p>Evidence files attached to it are deleted too, unless the same file is still attached to another entry or case - those files are kept there.</p>
        )}
      </ConfirmDialog>
    </>
  )
}
