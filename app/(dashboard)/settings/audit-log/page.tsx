import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type AuditRow = {
  id: string
  action: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
  const supabase = createClient()
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
      <Link href="/settings" className="text-sm text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2]">Back to settings</Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#F5F5F2]">Audit log</h1>

      <form className="mt-6 flex flex-wrap gap-2">
        <select name="action" defaultValue={params.action ?? ''} className="min-h-[44px] rounded-xl border border-white/[0.08] bg-[#141416] px-3 text-sm text-[#F5F5F2]">
          <option value="">Any action</option>
          {actions.map(action => <option key={action} value={action}>{action}</option>)}
        </select>
        <input type="date" name="from" defaultValue={params.from ?? ''} className="min-h-[44px] rounded-xl border border-white/[0.08] bg-[#141416] px-3 text-sm text-[#F5F5F2]" />
        <input type="date" name="to" defaultValue={params.to ?? ''} className="min-h-[44px] rounded-xl border border-white/[0.08] bg-[#141416] px-3 text-sm text-[#F5F5F2]" />
        <button className="min-h-[44px] rounded-xl border border-white/[0.08] bg-[#141416] px-4 text-sm font-medium text-[#F5F5F2]">Filter</button>
      </form>

      <div className="mt-6 space-y-3">
        {rows.map(row => (
          <article key={row.id} className="rounded-2xl border border-white/[0.08] bg-[#141416] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-[#F5F5F2]">{row.action}</p>
              <time className="text-xs text-[rgba(245,245,242,0.55)]">{new Date(row.created_at).toLocaleString('en-GB')}</time>
            </div>
            {row.metadata && <pre className="mt-3 overflow-x-auto rounded-lg bg-[#0B0B0C] p-3 text-xs text-[rgba(245,245,242,0.72)]">{JSON.stringify(row.metadata, null, 2)}</pre>}
          </article>
        ))}
        {rows.length === 0 && <p className="rounded-2xl border border-white/[0.08] bg-[#141416] p-6 text-sm text-[rgba(245,245,242,0.55)]">No audit events found.</p>}
      </div>
    </div>
  )
}
