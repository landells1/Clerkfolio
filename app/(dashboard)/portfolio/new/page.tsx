import { createClient } from '@/lib/supabase/server'
import EntryForm from '@/components/portfolio/entry-form'
import { type Category } from '@/lib/types/portfolio'
import type { Template } from '@/lib/types/templates'
import Link from 'next/link'

export default async function NewEntryPage({
  searchParams,
}: {
  searchParams: { category?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: trackedSpecialties }, { data: rawTemplates }] = await Promise.all([
    supabase
      .from('specialty_applications')
      .select('specialty_key')
      .eq('user_id', user!.id),
    supabase
      .from('templates')
      .select('*')
      .or(`user_id.eq.${user!.id},user_id.is.null`)
      .order('is_curated', { ascending: false })
      .order('created_at', { ascending: true }),
  ])

  const specialtyKeys = trackedSpecialties?.map(s => s.specialty_key) ?? []
  const templates = (rawTemplates ?? []) as Template[]
  const defaultCategory = (searchParams.category as Category) ?? undefined

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/portfolio"
          className="text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">New entry</h1>
          <p className="text-sm text-[rgba(245,245,242,0.45)] mt-0.5">Log a new portfolio achievement</p>
        </div>
      </div>

      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6">
        <EntryForm
          mode="create"
          defaultCategory={defaultCategory}
          userInterests={specialtyKeys}
          templates={templates}
        />
      </div>
    </div>
  )
}
