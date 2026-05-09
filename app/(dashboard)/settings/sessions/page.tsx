'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'

type SessionRow = {
  id: string
  ip_hash: string
  user_agent: string | null
  last_seen_at: string
  revoked_at: string | null
  created_at: string
}

export default function SessionsPage() {
  const supabase = createClient()
  const { addToast } = useToast()
  const [rows, setRows] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('session_fingerprints')
        .select('id, ip_hash, user_agent, last_seen_at, revoked_at, created_at')
        .eq('user_id', user.id)
        .order('last_seen_at', { ascending: false })
      setRows((data ?? []) as SessionRow[])
      setLoading(false)
    }
    load()
  }, [supabase])

  async function revoke(id: string) {
    const { error } = await supabase
      .from('session_fingerprints')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      addToast('Could not revoke session', 'error')
      return
    }
    setRows(current => current.map(row => row.id === id ? { ...row, revoked_at: new Date().toISOString() } : row))
    addToast('Session revoked', 'success')
  }

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8">
      <Link href="/settings" className="text-sm text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2]">Back to settings</Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#F5F5F2]">Sessions</h1>
      <p className="mt-2 text-sm text-[rgba(245,245,242,0.55)]">
        Each row is a browser/IP combination that has signed in. Revoking a row signs that device out
        on its next page load - including the device you&apos;re using right now if you revoke its row.
      </p>
      <div className="mt-6 space-y-3">
        {loading ? <p className="text-sm text-[rgba(245,245,242,0.55)]">Loading sessions...</p> : rows.map(row => (
          <article key={row.id} className="rounded-2xl border border-white/[0.08] bg-[#141416] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#F5F5F2]">{row.user_agent ?? 'Unknown browser'}</p>
                <p className="mt-1 font-mono text-xs text-[rgba(245,245,242,0.55)]">{row.ip_hash.slice(0, 12)}... - last seen {new Date(row.last_seen_at).toLocaleString('en-GB')}</p>
              </div>
              {row.revoked_at ? (
                <span className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-300">Revoked</span>
              ) : (
                <button onClick={() => revoke(row.id)} className="min-h-[36px] rounded-lg border border-red-500/20 px-3 text-xs font-medium text-red-300">Revoke</button>
              )}
            </div>
          </article>
        ))}
        {!loading && rows.length === 0 && <p className="rounded-2xl border border-white/[0.08] bg-[#141416] p-6 text-sm text-[rgba(245,245,242,0.55)]">No session fingerprints recorded yet.</p>}
      </div>
    </div>
  )
}
