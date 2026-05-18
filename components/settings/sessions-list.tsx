'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/toast-provider'

export type SessionRow = {
  id: string
  ip_hash: string
  user_agent: string | null
  last_seen_at: string
  revoked_at: string | null
  created_at: string
}

export default function SessionsList({ initialRows }: { initialRows: SessionRow[] }) {
  const { addToast } = useToast()
  const [rows, setRows] = useState(initialRows)

  async function revoke(id: string) {
    // Direct UPDATE of session_fingerprints was removed from the
    // authenticated RLS policy in 2026-05-18; the revoked session could
    // otherwise un-revoke itself. Server route uses service-role write.
    const res = await fetch('/api/account/sessions/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      addToast('Could not revoke session', 'error')
      return
    }
    const revokedAt = new Date().toISOString()
    setRows(current => current.map(row => row.id === id ? { ...row, revoked_at: revokedAt } : row))
    addToast('Session revoked', 'success')
  }

  return (
    <div className="mt-6 space-y-3">
      {rows.map(row => (
        <article key={row.id} className="rounded-2xl border border-white/[0.08] bg-[#141416] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#F5F5F2]">{row.user_agent ?? 'Unknown browser'}</p>
              <p className="mt-1 font-mono text-xs text-[rgba(245,245,242,0.55)]">{row.ip_hash.slice(0, 12)}... - last seen {new Date(row.last_seen_at).toLocaleString('en-GB')}</p>
            </div>
            {row.revoked_at ? (
              <span className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-100">Revoked</span>
            ) : (
              <button onClick={() => revoke(row.id)} className="min-h-[36px] rounded-lg border border-red-500/20 px-3 text-xs font-medium text-red-100">Revoke</button>
            )}
          </div>
        </article>
      ))}
      {rows.length === 0 && <p className="rounded-2xl border border-white/[0.08] bg-[#141416] p-6 text-sm text-[rgba(245,245,242,0.55)]">No session fingerprints recorded yet.</p>}
    </div>
  )
}
