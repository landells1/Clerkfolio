'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'

export default function DuplicateEntryButton({ entryId }: { entryId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)

  async function handleDuplicate() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: original, error: fetchError } = await supabase
        .from('portfolio_entries')
        .select('*')
        .eq('id', entryId)
        .eq('user_id', user.id)
        .single()

      if (fetchError || !original) {
        addToast('Could not load entry to duplicate', 'error')
        return
      }

      const { id: _, created_at: __, updated_at: ___, deleted_at: ____, pinned: _____, ...rest } = original

      const { data: newEntry, error: insertError } = await supabase
        .from('portfolio_entries')
        .insert({ ...rest, title: `${rest.title} (copy)`, user_id: user.id })
        .select('id')
        .single()

      if (insertError || !newEntry) {
        addToast('Failed to duplicate entry', 'error')
        return
      }

      router.push(`/portfolio/${newEntry.id}/edit`)
    } catch {
      addToast('Something went wrong', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDuplicate}
      disabled={loading}
      className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[rgba(245,245,242,0.6)] border border-white/[0.08] rounded-lg hover:text-[#F5F5F2] hover:border-white/[0.15] transition-colors disabled:opacity-50"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
      {loading ? 'Duplicating…' : 'Duplicate'}
    </button>
  )
}
