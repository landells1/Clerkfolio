'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'

export type UpcomingTimelineItem = {
  id: string
  title: string
  date: string
  type: 'Deadline' | 'Goal'
}

export default function UpcomingTimeline({ items }: { items: UpcomingTimelineItem[] }) {
  const [visibleItems, setVisibleItems] = useState(items)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()
  const { addToast } = useToast()

  async function completeDeadline(item: UpcomingTimelineItem) {
    setPendingId(item.id)
    const previousItems = visibleItems
    setVisibleItems(current => current.filter(row => row.id !== item.id))

    const { error } = await supabase
      .from('deadlines')
      .update({ completed: true })
      .eq('id', item.id)

    if (error) {
      setVisibleItems(previousItems)
      addToast('Could not complete deadline', 'error')
    } else {
      addToast('Deadline completed', 'success')
      startTransition(() => router.refresh())
    }

    setPendingId(null)
  }

  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-[#F5F5F2]">Upcoming this month</p>
        <Link href="/timeline" className="text-xs text-[#1B6FD9] hover:text-[#3884DD]">Timeline</Link>
      </div>
      <div className="space-y-2">
        {visibleItems.length === 0 ? (
          <p className="text-sm text-[rgba(245,245,242,0.35)]">No upcoming timeline items.</p>
        ) : visibleItems.map(item => (
          <div key={`${item.type}-${item.id}-${item.date}`} className="flex items-center justify-between gap-3 rounded-lg bg-[#0B0B0C] border border-white/[0.06] px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm text-[#F5F5F2]">{item.title}</p>
              <p className="text-[11px] text-[rgba(245,245,242,0.35)]">{item.type}</p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <span className="text-xs text-[rgba(245,245,242,0.45)]">{new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              {item.type === 'Deadline' && (
                <button
                  type="button"
                  disabled={pendingId === item.id}
                  onClick={() => completeDeadline(item)}
                  aria-label={`Complete ${item.title}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] text-[rgba(245,245,242,0.45)] hover:border-[#1B6FD9]/40 hover:text-[#1B6FD9] disabled:opacity-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
