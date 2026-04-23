import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/sidebar'
import DashboardProviders from './providers'
import FAB from '@/components/ui/fab'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, onboarding_complete, specialty_interests')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')
  if (!profile.onboarding_complete) redirect('/onboarding')

  return (
    <DashboardProviders userInterests={profile?.specialty_interests ?? []}>
      <div className="flex h-screen bg-[#0B0B0C] overflow-hidden">
        <Sidebar profile={profile} />
        <main className="flex-1 lg:ml-[240px] overflow-y-auto pt-14 lg:pt-0">
          {children}
        </main>
      </div>
      <FAB />
    </DashboardProviders>
  )
}
