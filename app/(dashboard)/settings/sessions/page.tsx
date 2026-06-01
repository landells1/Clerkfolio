import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SessionsList, { type SessionRow } from '@/components/settings/sessions-list'

export default async function SessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data, error }, { data: profile }] = user
    ? await Promise.all([
        supabase
          .from('session_fingerprints')
          .select('id, ip_hash, user_agent, last_seen_at, revoked_at, created_at')
          .eq('user_id', user.id)
          .order('last_seen_at', { ascending: false }),
        supabase.from('profiles').select('timezone').eq('id', user.id).maybeSingle(),
      ])
    : [{ data: [] as SessionRow[], error: null }, { data: null }]
  const timezone = profile?.timezone ?? 'Europe/London'

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8">
      <Link href="/settings" className="text-sm text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2]">Back to settings</Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#F5F5F2]">Sessions</h1>
      <p className="mt-2 text-sm text-[rgba(245,245,242,0.55)]">
        Each row is a browser/IP combination that has signed in. Revoking a row signs that device out
        on its next page load - including the device you&apos;re using right now if you revoke its row.
      </p>
      {error ? (
        <p className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-100">
          Could not load sessions. Refresh the page or try again later.
        </p>
      ) : (
        <SessionsList initialRows={(data ?? []) as SessionRow[]} timezone={timezone} />
      )}
    </div>
  )
}
