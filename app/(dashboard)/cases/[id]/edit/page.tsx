import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CaseForm from '@/components/cases/case-form'

export default async function EditCasePage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: c }, { data: profile }] = await Promise.all([
    supabase
      .from('cases')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user!.id)
      .single(),
    supabase
      .from('profiles')
      .select('specialty_interests')
      .eq('id', user!.id)
      .single(),
  ])

  if (!c) notFound()

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/cases/${params.id}`} className="text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Edit case</h1>
          <p className="text-sm text-[rgba(245,245,242,0.45)] mt-0.5 truncate max-w-xs">{c.title}</p>
        </div>
      </div>

      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6">
        <CaseForm
          mode="edit"
          initialData={c}
          userInterests={profile?.specialty_interests ?? []}
        />
      </div>
    </div>
  )
}
