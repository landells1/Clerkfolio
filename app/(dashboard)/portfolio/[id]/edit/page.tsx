import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import EntryForm from '@/components/portfolio/entry-form'

export default async function EditEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: entry }, { data: trackedSpecialties }] = await Promise.all([
    supabase
      .from('portfolio_entries')
      .select('*')
      .eq('id', id)
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .single(),
    supabase
      .from('specialty_applications')
      .select('specialty_key')
      .eq('user_id', user!.id),
  ])

  if (!entry) notFound()

  const specialtyKeys = trackedSpecialties?.map(s => s.specialty_key) ?? []

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href={`/portfolio/${id}`}
          className="text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Edit entry</h1>
          <p className="text-sm text-[rgba(245,245,242,0.45)] mt-0.5 truncate max-w-xs">{entry.title}</p>
        </div>
      </div>

      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6">
        <EntryForm
          mode="edit"
          initialData={entry}
          userInterests={specialtyKeys}
        />
      </div>
    </div>
  )
}
