'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'

export default function EmptyTrashButton() {
  const supabase = createClient()
  const router = useRouter()
  const { addToast } = useToast()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  async function emptyTrash() {
    if (confirm !== 'EMPTY') return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ error: entryError }, { error: caseError }] = await Promise.all([
      supabase.from('portfolio_entries').delete().eq('user_id', user.id).not('deleted_at', 'is', null),
      supabase.from('cases').delete().eq('user_id', user.id).not('deleted_at', 'is', null),
    ])
    setLoading(false)
    if (entryError || caseError) {
      addToast('Could not empty trash', 'error')
      return
    }
    addToast('Trash emptied', 'success')
    setOpen(false)
    setConfirm('')
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="min-h-[44px] rounded-xl border border-red-500/20 px-4 text-sm font-medium text-red-300">
        Empty trash
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl border border-white/[0.08] bg-[#141416] p-6 sm:rounded-2xl">
            <h2 className="text-lg font-semibold text-[#F5F5F2]">Empty trash?</h2>
            <p className="mt-2 text-sm text-[rgba(245,245,242,0.72)]">Type EMPTY to permanently remove deleted entries and cases.</p>
            <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="EMPTY" className="mt-5 w-full min-h-[44px] rounded-lg border border-red-500/20 bg-[#0B0B0C] px-3.5 text-sm text-[#F5F5F2]" />
            <div className="mt-5 flex gap-2">
              <button onClick={() => setOpen(false)} className="min-h-[44px] flex-1 rounded-lg border border-white/[0.08] text-sm text-[#F5F5F2]">Cancel</button>
              <button onClick={emptyTrash} disabled={confirm !== 'EMPTY' || loading} className="min-h-[44px] flex-1 rounded-lg bg-red-500 px-4 text-sm font-semibold text-white disabled:opacity-40">
                {loading ? 'Emptying...' : 'Empty'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
