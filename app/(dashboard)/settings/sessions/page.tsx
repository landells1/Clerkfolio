import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SessionsList, { type SessionRow } from '@/components/settings/sessions-list'
import { describeUserAgent, readSessionIdFromJwt } from '@/lib/auth/user-agent'

export default async function SessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data, error }, { data: profile }] = user
    ? await Promise.all([
        supabase
          .from('session_fingerprints')
          .select('id, user_agent, session_id, last_seen_at, revoked_at, created_at')
          .eq('user_id', user.id)
          .order('last_seen_at', { ascending: false }),
        supabase.from('profiles').select('timezone').eq('id', user.id).maybeSingle(),
      ])
    : [{ data: [] as SessionRow[], error: null }, { data: null }]
  const timezone = profile?.timezone ?? 'Europe/London'
  // Mark the row for the session making this request ("This device"). The
  // session id and IP hash stay on the server; the client only gets a label.
  const { data: sessionData } = await supabase.auth.getSession()
  const currentSessionId = readSessionIdFromJwt(sessionData.session?.access_token)
  const rows: SessionRow[] = ((data ?? []) as { id: string; user_agent: string | null; session_id: string | null; last_seen_at: string; revoked_at: string | null; created_at: string }[])
    .map(row => ({
      id: row.id,
      device: describeUserAgent(row.user_agent),
      isCurrent: Boolean(currentSessionId && row.session_id === currentSessionId && !row.revoked_at),
      last_seen_at: row.last_seen_at,
      revoked_at: row.revoked_at,
      created_at: row.created_at,
    }))
    .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent))

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8">
      <Link href="/settings" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Back to settings</Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Sessions</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Each row is a browser that has signed in to your account. Revoking a row signs that device out
        within a few minutes - including the device you&apos;re using right now if you revoke its row.
        &quot;Last active&quot; updates about every five minutes while a device is in use.
      </p>
      {error ? (
        <p className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-[var(--danger)]">
          Could not load sessions. Refresh the page or try again later.
        </p>
      ) : (
        <SessionsList initialRows={rows} timezone={timezone} />
      )}
    </div>
  )
}
