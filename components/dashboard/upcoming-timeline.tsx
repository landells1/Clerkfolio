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
    <div className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Upcoming this month</p>
        <Link href="/timeline" className="text-xs text-[var(--accent-text)] hover:text-[var(--accent-bright)]">Timeline</Link>
      </div>
      <div className="space-y-2">
        {visibleItems.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No upcoming timeline items.</p>
        ) : visibleItems.map(item => (
          <div key={`${item.type}-${item.id}-${item.date}`} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--bg-canvas)] border border-white/[0.06] px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm text-[var(--text-primary)]">{item.title}</p>
              <p className="text-[11px] text-[var(--text-secondary)]">{item.type}</p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">{new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              {item.type === 'Deadline' && (
                <button
                  type="button"
                  disabled={pendingId === item.id}
                  onClick={() => completeDeadline(item)}
                  aria-label={`Complete ${item.title}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] text-[var(--text-muted)] hover:border-[#1B6FD9]/40 hover:text-[var(--accent-text)] disabled:opacity-50"
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
