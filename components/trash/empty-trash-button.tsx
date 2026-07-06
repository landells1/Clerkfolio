'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'
import { purgeEvidenceForEntriesClient, type EvidencePurgeTarget } from '@/lib/evidence/client-purge'

export default function EmptyTrashButton({
  eligibleCount,
  retainedCount,
  nextEligibleAt,
}: {
  eligibleCount: number
  retainedCount: number
  nextEligibleAt: string | null
}) {
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
    if (!user) {
      setLoading(false)
      addToast('Please sign in again', 'error')
      return
    }
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()
    const [{ data: expiredEntries, error: entryLookupError }, { data: expiredCases, error: caseLookupError }] = await Promise.all([
      supabase.from('portfolio_entries').select('id').eq('user_id', user.id).lt('deleted_at', thirtyDaysAgo).not('deleted_at', 'is', null),
      supabase.from('cases').select('id').eq('user_id', user.id).lt('deleted_at', thirtyDaysAgo).not('deleted_at', 'is', null),
    ])
    if (entryLookupError || caseLookupError) {
      setLoading(false)
      addToast('Could not empty trash', 'error')
      return
    }

    const entryIds = (expiredEntries ?? []).map(row => row.id)
    const caseIds = (expiredCases ?? []).map(row => row.id)
    if (entryIds.length === 0 && caseIds.length === 0) {
      setLoading(false)
      addToast('No items are eligible for permanent deletion yet. Deleted items stay restorable for 30 days.', 'info')
      setOpen(false)
      setConfirm('')
      return
    }
    // Evidence reuse: unlink every expiring entry's files and delete only the
    // files whose last link is now gone (a file still linked to a live entry
    // survives). Shared with the per-row "delete permanently" flow.
    const purgeTargets: EvidencePurgeTarget[] = [
      ...entryIds.map(id => ({ entryId: id, entryType: 'portfolio' as const })),
      ...caseIds.map(id => ({ entryId: id, entryType: 'case' as const })),
    ]
    const purge = await purgeEvidenceForEntriesClient(supabase, user.id, purgeTargets)
    if (purge.error) {
      setLoading(false)
      addToast(purge.error, 'error')
      return
    }

    const [{ error: entryError }, { error: caseError }] = await Promise.all([
      supabase.from('portfolio_entries').delete().eq('user_id', user.id).lt('deleted_at', thirtyDaysAgo).not('deleted_at', 'is', null),
      supabase.from('cases').delete().eq('user_id', user.id).lt('deleted_at', thirtyDaysAgo).not('deleted_at', 'is', null),
    ])
    setLoading(false)
    if (entryError || caseError) {
      addToast('Could not empty trash', 'error')
      return
    }
    const deletedCount = entryIds.length + caseIds.length
    addToast(`${deletedCount} expired ${deletedCount === 1 ? 'item' : 'items'} permanently deleted`, 'success')
    setOpen(false)
    setConfirm('')
    router.refresh()
  }

  return (
    <>
      <div className="sm:max-w-[260px]">
        <button
          onClick={() => setOpen(true)}
          disabled={eligibleCount === 0}
          className="min-h-[44px] w-full rounded-xl border border-red-500/20 px-4 text-sm font-medium text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Empty trash
        </button>
        {eligibleCount === 0 && retainedCount > 0 && nextEligibleAt && (
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
            No items can be permanently deleted yet. The next item becomes eligible after{' '}
            {new Date(new Date(nextEligibleAt).getTime() + 30 * 86_400_000).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}.
          </p>
        )}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-6 sm:rounded-2xl">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Empty trash?</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Type EMPTY to permanently remove deleted entries and cases whose 30-day restore window has passed.</p>
            <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="EMPTY" className="mt-5 w-full min-h-[44px] rounded-lg border border-red-500/20 bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)]" />
            <div className="mt-5 flex gap-2">
              <button onClick={() => setOpen(false)} className="min-h-[44px] flex-1 rounded-lg border border-white/[0.08] text-sm text-[var(--text-primary)]">Cancel</button>
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
