'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'

export default function PinCaseButton({ caseId, initialPinned }: { caseId: string; initialPinned: boolean }) {
  const supabase = createClient()
  const { addToast } = useToast()
  const [pinned, setPinned] = useState(initialPinned)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    const newVal = !pinned
    const { error } = await supabase.from('cases').update({ pinned: newVal }).eq('id', caseId)
    if (error) {
      addToast('Failed to update pin status', 'error')
    } else {
      setPinned(newVal)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={pinned ? 'Unpin case' : 'Pin as highlight'}
      className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium border rounded-lg transition-colors disabled:opacity-50 ${
        pinned
          ? 'bg-amber-400/10 border-amber-400/30 text-amber-400 hover:bg-amber-400/20'
          : 'text-[rgba(245,245,242,0.6)] border-white/[0.08] hover:text-[#F5F5F2] hover:border-white/[0.15]'
      }`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill={pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
      {pinned ? 'Pinned' : 'Pin'}
    </button>
  )
}
