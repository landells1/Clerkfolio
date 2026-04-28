import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/sidebar'
import DashboardProviders from './providers'
import FAB from '@/components/ui/fab'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { data: trackedSpecialties }] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, last_name, career_stage, onboarding_complete')
      .eq('id', user.id)
      .single(),
    supabase
      .from('specialty_applications')
      .select('specialty_key')
      .eq('user_id', user.id),
  ])

  if (!profile) redirect('/onboarding')
  if (!profile.onboarding_complete) redirect('/onboarding')

  const specialtyKeys = trackedSpecialties?.map(s => s.specialty_key) ?? []

  return (
    <DashboardProviders userInterests={specialtyKeys}>
      <div className="flex h-screen bg-[#0B0B0C] overflow-hidden">
        <Sidebar profile={profile} />
        <main className="flex-1 lg:ml-[240px] overflow-y-auto pt-14 lg:pt-0 pb-16 lg:pb-0">
          {children}
        </main>
      </div>
      <FAB />
    </DashboardProviders>
  )
}
