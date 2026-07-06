'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { ChangelogEntry } from '@/lib/changelog'
import { ChangelogEntryList } from './changelog-entry-list'

export default function ChangelogModal({ userId, entries }: { userId: string; entries: ChangelogEntry[] }) {
  const [open, setOpen] = useState(entries.length > 0)
  if (!open || entries.length === 0) return null
  async function dismiss() {
    setOpen(false)
    await createClient().from('profiles').update({ changelog_seen_at: new Date().toISOString() }).eq('id', userId)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-6 sm:rounded-2xl">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">What&apos;s new</h2>
        <div className="mt-4">
          <ChangelogEntryList entries={entries} />
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <Link href="/help/whats-new" onClick={dismiss} className="text-sm text-[var(--accent-text)] hover:underline">
            See all updates
          </Link>
          <button onClick={dismiss} className="min-h-[44px] rounded-xl bg-[var(--button-primary-bg)] px-5 text-sm font-semibold text-[var(--button-primary-text)]">Got it</button>
        </div>
      </div>
    </div>
  )
}
