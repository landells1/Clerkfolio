'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/toast-provider'
import { apiFetch } from '@/lib/api-fetch'

export type SessionRow = {
  id: string
  ip_hash: string
  user_agent: string | null
  last_seen_at: string
  revoked_at: string | null
  created_at: string
}

function formatSessionDate(value: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
      timeZoneName: 'short',
    }).format(new Date(value))
  } catch {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/London',
      timeZoneName: 'short',
    }).format(new Date(value))
  }
}

function relativeLastSeen(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function SessionsList({ initialRows, timezone }: { initialRows: SessionRow[]; timezone: string }) {
  const { addToast } = useToast()
  const [rows, setRows] = useState(initialRows)

  async function revoke(id: string) {
    // Direct UPDATE of session_fingerprints was removed from the
    // authenticated RLS policy in 2026-05-18; the revoked session could
    // otherwise un-revoke itself. Server route uses service-role write.
    const { ok } = await apiFetch('/api/account/sessions/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!ok) {
      addToast('Could not revoke session', 'error')
      return
    }
    const revokedAt = new Date().toISOString()
    setRows(current => current.map(row => row.id === id ? { ...row, revoked_at: revokedAt } : row))
    addToast('Session revoked', 'success')
  }

  return (
    <div className="mt-6 space-y-3">
      <p className="text-xs text-[var(--text-secondary)]">Times shown in {timezone}.</p>
      {rows.map(row => (
        <article key={row.id} className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--text-primary)]">{row.user_agent ?? 'Unknown browser'}</p>
              <p className="mt-1 font-mono text-xs text-[var(--text-secondary)]">{row.ip_hash.slice(0, 12)}... - last seen {formatSessionDate(row.last_seen_at, timezone)} ({relativeLastSeen(row.last_seen_at)})</p>
            </div>
            {row.revoked_at ? (
              <span className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-100">Revoked</span>
            ) : (
              <button onClick={() => revoke(row.id)} className="min-h-[36px] rounded-lg border border-red-500/20 px-3 text-xs font-medium text-red-100">Revoke</button>
            )}
          </div>
        </article>
      ))}
      {rows.length === 0 && <p className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">No session fingerprints recorded yet.</p>}
    </div>
  )
}
