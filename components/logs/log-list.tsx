'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'
import SwipeToDelete from '@/components/ui/swipe-to-delete'

export type PersonalLogListRow = {
  id: string
  title: string
  date: string
  expires_at: string | null
  cpd_hours: number | null
  attempts: number | null
  score: string | null
  cost_pence: number | null
  meta: { detail?: string } | null
  notes: string | null
}

export default function LogList({ rows }: { rows: PersonalLogListRow[] }) {
  const [visibleRows, setVisibleRows] = useState(rows)
  const supabase = createClient()
  const router = useRouter()
  const { addToast } = useToast()

  useEffect(() => setVisibleRows(rows), [rows])

  async function deleteLog(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      addToast('Please sign in again', 'error')
      return
    }
    const { error } = await supabase
      .from('personal_log')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      addToast('Failed to delete log entry', 'error')
      return
    }
    setVisibleRows(prev => prev.filter(row => row.id !== id))
    addToast('Log entry moved to trash', 'success')
    router.refresh()
  }

  return (
    <div className="divide-y divide-white/[0.06]">
      {visibleRows.map(row => (
        <SwipeToDelete
          key={row.id}
          title="Move log entry to trash?"
          description={row.title}
          onConfirm={() => deleteLog(row.id)}
        >
          <div className="bg-[#141416] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-[#F5F5F2]">{row.title}</h2>
                <p className="mt-1 text-xs text-[rgba(245,245,242,0.4)]">{new Date(row.date).toLocaleDateString('en-GB')}</p>
              </div>
              {row.expires_at && <span className="rounded bg-amber-400/10 px-2 py-1 text-xs text-amber-300">Expires {new Date(row.expires_at).toLocaleDateString('en-GB')}</span>}
            </div>
            <p className="mt-2 text-sm text-[rgba(245,245,242,0.55)]">
              {[row.cpd_hours ? `${row.cpd_hours} CPD h` : '', row.score ? `Score ${row.score}` : '', row.attempts ? `${row.attempts} attempts` : '', row.cost_pence ? `£${(row.cost_pence / 100).toFixed(2)}` : '', row.meta?.detail ?? ''].filter(Boolean).join(' - ')}
            </p>
            {row.notes && <p className="mt-2 text-sm leading-6 text-[rgba(245,245,242,0.58)]">{row.notes}</p>}
          </div>
        </SwipeToDelete>
      ))}
    </div>
  )
}
