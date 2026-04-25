'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'

export default function TrashActions({ id, type }: { id: string; type: 'entry' | 'case' }) {
  const supabase = createClient()
  const router = useRouter()
  const { addToast } = useToast()
  const [loading, setLoading] = useState<'restore' | 'delete' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleRestore() {
    setLoading('restore')
    const table = type === 'entry' ? 'portfolio_entries' : 'cases'
    const { error } = await supabase.from(table).update({ deleted_at: null }).eq('id', id)
    if (error) {
      addToast('Failed to restore. Please try again.', 'error')
    } else {
      router.refresh()
    }
    setLoading(null)
  }

  async function handlePermanentDelete() {
    setLoading('delete')
    const table = type === 'entry' ? 'portfolio_entries' : 'cases'
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) {
      addToast('Failed to delete. Please try again.', 'error')
    } else {
      router.refresh()
    }
    setLoading(null)
    setConfirmDelete(false)
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button onClick={handleRestore} disabled={!!loading}
        className="text-xs text-[#1B6FD9] hover:text-[#3884DD] transition-colors disabled:opacity-50">
        {loading === 'restore' ? 'Restoring…' : 'Restore'}
      </button>
      {confirmDelete ? (
        <div className="flex items-center gap-1.5">
          <button onClick={handlePermanentDelete} disabled={!!loading}
            className="text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50">
            {loading === 'delete' ? '…' : 'Confirm'}
          </button>
          <button onClick={() => setConfirmDelete(false)} className="text-xs text-[rgba(245,245,242,0.35)]">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setConfirmDelete(true)}
          className="text-xs text-[rgba(245,245,242,0.3)] hover:text-red-400 transition-colors">
          Delete forever
        </button>
      )}
    </div>
  )
}
