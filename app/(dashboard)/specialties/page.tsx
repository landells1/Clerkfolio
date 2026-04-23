import { createClient } from '@/lib/supabase/server'
import { SpecialtiesShell } from '@/components/specialties/specialties-shell'
import type { SpecialtyApplication, SpecialtyEntryLink } from '@/lib/specialties'

export default async function SpecialtiesPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-[rgba(245,245,242,0.4)] text-sm">Please sign in to view specialty tracking.</p>
      </div>
    )
  }

  const { data: applications } = await supabase
    .from('specialty_applications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const apps: SpecialtyApplication[] = (applications ?? []) as SpecialtyApplication[]

  let links: SpecialtyEntryLink[] = []
  if (apps.length > 0) {
    const appIds = apps.map(a => a.id)
    const { data: linkData } = await supabase
      .from('specialty_entry_links')
      .select('*')
      .in('application_id', appIds)
      .order('created_at', { ascending: true })
    links = (linkData ?? []) as SpecialtyEntryLink[]
  }

  return <SpecialtiesShell applications={apps} links={links} />
}
