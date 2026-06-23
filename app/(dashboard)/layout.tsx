import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/sidebar'
import DashboardProviders from './providers'
import FAB from '@/components/ui/fab'
import { PrintHeader } from '@/components/print-header'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { data: trackedSpecialties }] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, last_name, career_stage, onboarding_complete, tier, pro_features_used')
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
  const userName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Clerkfolio user'

  // Effective Pro access for the sidebar Upgrade link (F-029/F-003), computed
  // cheaply from the already-fetched profile (no extra entitlements RPC):
  // permanent = real Stripe tier; access = Stripe OR an active referral/gift
  // grant (pro_features_used.referral_pro_until in the future).
  const proIsPermanent = profile.tier === 'pro'
  const referralUntil = (profile.pro_features_used as { referral_pro_until?: string | null } | null)?.referral_pro_until ?? null
  const proAccess = proIsPermanent || (referralUntil != null && new Date(referralUntil).getTime() > Date.now())

  return (
    <DashboardProviders userInterests={specialtyKeys} careerStage={profile.career_stage}>
      <div className="flex h-screen bg-surface-0 overflow-hidden">
        <Sidebar profile={{ ...profile, proAccess, proIsPermanent }} userEmail={user.email ?? ''} />
        <main className="flex-1 lg:ml-[240px] overflow-y-auto pt-14 lg:pt-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          <PrintHeader userName={userName} />
          {children}
        </main>
      </div>
      <FAB />
    </DashboardProviders>
  )
}
