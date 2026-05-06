import Link from 'next/link'
import { diffLines } from 'diff'
import { createClient } from '@/lib/supabase/server'

type Revision = { id: string; snapshot: Record<string, unknown>; created_at: string }

function renderSnapshot(snapshot: Record<string, unknown>) {
  return JSON.stringify(snapshot, null, 2)
}

export default async function CaseDiffPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ a?: string; b?: string }>
}) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const ids = [query.a, query.b].filter(Boolean) as string[]
  const { data } = ids.length === 2
    ? await supabase
        .from('entry_revisions')
        .select('id, snapshot, created_at')
        .eq('user_id', user!.id)
        .eq('entry_id', id)
        .eq('entry_type', 'case')
        .in('id', ids)
    : { data: [] }

  const revisions = (data ?? []) as Revision[]
  const a = revisions.find(rev => rev.id === query.a)
  const b = revisions.find(rev => rev.id === query.b)
  const changes = a && b ? diffLines(renderSnapshot(a.snapshot), renderSnapshot(b.snapshot)) : []

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-8">
      <Link href={`/cases/${id}/history`} className="text-sm text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2]">Back to history</Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#F5F5F2]">Revision diff</h1>
      <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141416]">
        {changes.length === 0 ? (
          <p className="p-6 text-sm text-[rgba(245,245,242,0.55)]">Choose two revisions to compare.</p>
        ) : (
          <pre className="overflow-x-auto p-0 text-xs leading-6">
            {changes.map((part, index) => (
              <span key={index} className={`block whitespace-pre-wrap px-4 ${part.added ? 'bg-emerald-500/10 text-emerald-200' : part.removed ? 'bg-red-500/10 text-red-200' : 'text-[rgba(245,245,242,0.72)]'}`}>
                {part.value}
              </span>
            ))}
          </pre>
        )}
      </div>
    </div>
  )
}
