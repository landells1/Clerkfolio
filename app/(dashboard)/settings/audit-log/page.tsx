import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type AuditRow = {
  id: string
  action: string
  metadata: Record<string, unknown> | null
  created_at: string
}

const ACTION_LABELS: Record<string, string> = {
  share_link_generated: 'Share link created',
  share_link_viewed: 'Share link viewed',
  share_link_revoked: 'Share link revoked',
  profile_updated: 'Profile updated',
  password_updated: 'Password updated',
  password_changed: 'Password changed',
  password_reset: 'Password reset',
  auth_email_changed: 'Login email changed',
}

function formatAction(action: string) {
  return ACTION_LABELS[action] ?? action.split('_').map(part => part ? `${part[0].toUpperCase()}${part.slice(1)}` : '').join(' ')
}

function formatKey(key: string) {
  return key.split('_').map(part => part ? `${part[0].toUpperCase()}${part.slice(1)}` : '').join(' ')
}

function formatMetadataValue(value: unknown) {
  if (value === null || value === undefined) return 'None'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let query = supabase
    .from('audit_log')
    .select('id, action, metadata, created_at')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (params.action) query = query.eq('action', params.action)
  if (params.from) query = query.gte('created_at', `${params.from}T00:00:00.000Z`)
  if (params.to) query = query.lte('created_at', `${params.to}T23:59:59.999Z`)

  const { data } = await query
  const rows = (data ?? []) as AuditRow[]
  const actions = Array.from(new Set(rows.map(row => row.action))).sort()

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8">
      <Link href="/settings" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Back to settings</Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Audit log</h1>

      <form className="mt-6 flex flex-wrap gap-2">
        <select name="action" defaultValue={params.action ?? ''} className="min-h-[44px] rounded-xl border border-white/[0.08] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)]">
          <option value="">Any action</option>
          {actions.map(action => <option key={action} value={action}>{formatAction(action)}</option>)}
        </select>
        <input type="date" name="from" defaultValue={params.from ?? ''} className="min-h-[44px] rounded-xl border border-white/[0.08] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)]" />
        <input type="date" name="to" defaultValue={params.to ?? ''} className="min-h-[44px] rounded-xl border border-white/[0.08] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)]" />
        <button className="min-h-[44px] rounded-xl border border-white/[0.08] bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--text-primary)]">Filter</button>
      </form>

      <div className="mt-6 space-y-3">
        {rows.map(row => (
          <article key={row.id} className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-[var(--text-primary)]">{formatAction(row.action)}</p>
              <time className="text-xs text-[var(--text-secondary)]">{new Date(row.created_at).toLocaleString('en-GB')}</time>
            </div>
            {row.metadata && (
              <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-2 rounded-lg bg-[var(--bg-canvas)] p-3 text-xs text-[var(--text-secondary)]">
                {Object.entries(row.metadata).map(([key, value]) => (
                  <div key={key} className="flex min-w-0 gap-1.5">
                    <dt className="shrink-0 text-[var(--text-muted)]">{formatKey(key)}:</dt>
                    <dd className="min-w-0 break-all font-mono">{formatMetadataValue(value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </article>
        ))}
        {rows.length === 0 && <p className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">No audit events found.</p>}
      </div>
    </div>
  )
}
