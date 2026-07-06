'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'
import SwipeToDelete from '@/components/ui/swipe-to-delete'
import TrashActions from '@/components/trash/trash-actions'
import { purgeEvidenceForEntriesClient } from '@/lib/evidence/client-purge'

export type TrashItem = {
  id: string
  title: string
  subtitle: string
  category: string | null
  date: string
  deletedAt: string
  type: 'entry' | 'case'
}

export default function TrashRow({ item }: { item: TrashItem }) {
  const supabase = createClient()
  const router = useRouter()
  const { addToast } = useToast()
  const permanentDeleteAt = new Date(new Date(item.deletedAt).getTime() + 30 * 86_400_000)
  const canPermanentlyDelete = permanentDeleteAt.getTime() <= Date.now()
  const deletedDate = new Date(item.deletedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const entryDate = new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const typeLabel = item.type === 'entry' ? 'Portfolio' : 'Case'
  const entryType = item.type === 'entry' ? 'portfolio' : 'case'

  async function permanentlyDelete() {
    if (!canPermanentlyDelete) {
      addToast(`This item can be permanently deleted after ${permanentDeleteAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.`, 'error')
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      addToast('Please sign in again', 'error')
      return
    }
    const table = item.type === 'entry' ? 'portfolio_entries' : 'cases'

    // Evidence reuse: this entry's files may also be attached to other live
    // entries. Unlink this entry's files and delete only the ones whose last
    // link is now gone (a file still linked elsewhere survives).
    const purge = await purgeEvidenceForEntriesClient(supabase, user.id, [{ entryId: item.id, entryType }])
    if (purge.error) {
      addToast(purge.error, 'error')
      return
    }

    const { data: deletedRows, error } = await supabase
      .from(table)
      .delete()
      .eq('id', item.id)
      .eq('user_id', user.id)
      .lt('deleted_at', new Date(Date.now() - 30 * 86_400_000).toISOString())
      .not('deleted_at', 'is', null)
      .select('id')

    if (error) {
      addToast('Failed to delete item permanently', 'error')
      return
    }
    if (!deletedRows?.length) {
      addToast(`This item can be permanently deleted after ${permanentDeleteAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.`, 'error')
      return
    }
    addToast('Item deleted permanently', 'success')
    router.refresh()
  }

  async function confirmPermanentDelete() {
    if (!window.confirm(`Permanently delete "${item.title}"? This cannot be undone.`)) return
    await permanentlyDelete()
  }

  return (
    <SwipeToDelete
      title="Delete permanently?"
      description={`This permanently deletes "${item.title}" if its 30-day restore window has passed.`}
      confirmLabel="Delete permanently"
      onConfirm={permanentlyDelete}
    >
      <div className="flex items-center gap-3 bg-[var(--bg-surface)] border border-white/[0.08] rounded-lg px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[10px] font-medium text-[var(--text-secondary)]">
              {typeLabel}
            </span>
            <p className="text-sm text-[var(--text-primary)] truncate">{item.title}</p>
          </div>
          <p className="text-xs text-[var(--text-secondary)] capitalize">
            {item.subtitle} - {entryDate} - Deleted {deletedDate}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <TrashActions id={item.id} type={item.type} />
          {canPermanentlyDelete && (
            <button
              type="button"
              onClick={confirmPermanentDelete}
              className="text-xs text-[var(--danger)] transition-colors hover:text-[var(--danger)]"
            >
              Delete permanently
            </button>
          )}
        </div>
      </div>
    </SwipeToDelete>
  )
}
