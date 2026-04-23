'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteEntryButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('portfolio_entries').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    router.push('/portfolio')
    router.refresh()
  }

  if (confirm) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3.5 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {deleting ? 'Moving to trash…' : 'Move to trash'}
          </button>
          <button
            onClick={() => setConfirm(false)}
            className="px-3 py-2 text-sm text-[rgba(245,245,242,0.45)] hover:text-[#F5F5F2] transition-colors"
          >
            Cancel
          </button>
        </div>
        <p className="text-xs text-[rgba(245,245,242,0.35)]">Moved to trash. Recover from the Trash page.</p>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-colors"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
      Delete
    </button>
  )
}
