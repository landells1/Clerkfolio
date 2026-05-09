'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'
import SwipeToDelete from '@/components/ui/swipe-to-delete'
import TrashActions from '@/components/trash/trash-actions'

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
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', item.id)
      .eq('user_id', user.id)

    if (error) {
      addToast('Failed to delete item permanently', 'error')
      return
    }
    addToast('Item deleted permanently', 'success')
    router.refresh()
  }

  return (
    <SwipeToDelete
      title="Delete permanently?"
      description={`This permanently deletes "${item.title}" if its 30-day restore window has passed.`}
      confirmLabel="Delete permanently"
      onConfirm={permanentlyDelete}
    >
      <div className="flex items-center gap-3 bg-[#141416] border border-white/[0.08] rounded-lg px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[10px] font-medium text-[rgba(245,245,242,0.5)]">
              {typeLabel}
            </span>
            <p className="text-sm text-[rgba(245,245,242,0.82)] truncate">{item.title}</p>
          </div>
          <p className="text-xs text-[rgba(245,245,242,0.55)] capitalize">
            {item.subtitle} - {entryDate} - Deleted {deletedDate}
          </p>
        </div>
        <TrashActions id={item.id} type={item.type} />
      </div>
    </SwipeToDelete>
  )
}
