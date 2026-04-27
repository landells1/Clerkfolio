'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'

export default function TrashActions({ id, type }: { id: string; type: 'entry' | 'case' | 'logbook' }) {
  const supabase = createClient()
  const router = useRouter()
  const { addToast } = useToast()
  const [loading, setLoading] = useState<'restore' | null>(null)

  async function handleRestore() {
    if (loading) return
    setLoading('restore')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      addToast('Please sign in again', 'error')
      setLoading(null)
      return
    }

    const table =
      type === 'entry'
        ? 'portfolio_entries'
        : type === 'case'
          ? 'cases'
          : 'logbook_entries'
    const { error } = await supabase
      .from(table)
      .update({ deleted_at: null })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      addToast('Failed to restore. Please try again.', 'error')
    } else {
      addToast('Item restored', 'success')
      router.refresh()
    }
    setLoading(null)
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button onClick={handleRestore} disabled={!!loading}
        className="text-xs text-[#1B6FD9] hover:text-[#3884DD] transition-colors disabled:opacity-50">
        {loading === 'restore' ? 'Restoring…' : 'Restore'}
      </button>
    </div>
  )
}
