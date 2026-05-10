import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { SpecialtiesShell } from '@/components/specialties/specialties-shell'
import { fetchSubscriptionInfo } from '@/lib/subscription'
import type { SpecialtyApplication, SpecialtyEntryLink } from '@/lib/specialties'

export default async function SpecialtiesPage({
  searchParams,
}: {
  searchParams: Promise<{ app?: string }>
}) {
  const resolvedSearchParams = await searchParams
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

  const [{ data: applications }, subInfo] = await Promise.all([
    supabase
      .from('specialty_applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    fetchSubscriptionInfo(supabase, user.id),
  ])

  const apps: SpecialtyApplication[] = (applications ?? []) as SpecialtyApplication[]
  const isPro = subInfo.isPro
  const canTrackAnotherSpecialty = subInfo.limits.canTrackAnotherSpecialty

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

  return (
    <>
      {apps.filter(app => app.is_active).length >= 2 && (
        <div className="max-w-container mx-auto px-6 pt-6 lg:px-8">
          <Link href="/specialties/compare" className="inline-flex min-h-[40px] items-center rounded-lg border border-subtle bg-surface-1 px-4 text-sm font-medium text-fg hover:border-default transition-colors">
            Compare specialties
          </Link>
        </div>
      )}
      <SpecialtiesShell
        applications={apps}
        links={links}
        isPro={isPro}
        canTrackAnotherSpecialty={canTrackAnotherSpecialty}
        initialAppKey={resolvedSearchParams.app}
      />
    </>
  )
}
