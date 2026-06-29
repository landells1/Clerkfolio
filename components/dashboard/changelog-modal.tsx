'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ChangelogEntry } from '@/lib/changelog'

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
        <div className="mt-4 space-y-4">
          {entries.map(entry => (
            <article key={`${entry.date}-${entry.title}`} className="rounded-xl bg-[var(--bg-canvas)] p-4">
              <p className="text-xs text-[var(--text-muted)]">{new Date(entry.date).toLocaleDateString('en-GB')}</p>
              <h3 className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{entry.title}</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{entry.body}</p>
            </article>
          ))}
        </div>
        <button onClick={dismiss} className="mt-5 min-h-[44px] rounded-xl bg-[var(--accent)] px-5 text-sm font-semibold text-white">Got it</button>
      </div>
    </div>
  )
}
