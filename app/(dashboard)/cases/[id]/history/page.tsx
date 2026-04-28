import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function CaseHistoryPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: revisions } = await supabase
    .from('entry_revisions')
    .select('*')
    .eq('user_id', user!.id)
    .eq('entry_id', params.id)
    .eq('entry_type', 'case')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <Link href={`/cases/${params.id}`} className="text-sm text-[rgba(245,245,242,0.45)] hover:text-[#F5F5F2]">Back to case</Link>
      <h1 className="mt-4 text-2xl font-semibold text-[#F5F5F2] tracking-tight">Version history</h1>
      <div className="mt-6 space-y-3">
        {(revisions ?? []).length === 0 ? (
          <p className="rounded-2xl border border-white/[0.08] bg-[#141416] p-6 text-sm text-[rgba(245,245,242,0.45)]">No saved revisions yet.</p>
        ) : revisions!.map(revision => (
          <article key={revision.id} className="rounded-2xl border border-white/[0.08] bg-[#141416] p-5">
            <p className="text-sm font-medium text-[#F5F5F2]">{new Date(revision.created_at).toLocaleString('en-GB')}</p>
            <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-[#0B0B0C] p-4 text-xs text-[rgba(245,245,242,0.58)]">{JSON.stringify(revision.snapshot, null, 2)}</pre>
          </article>
        ))}
      </div>
    </div>
  )
}
