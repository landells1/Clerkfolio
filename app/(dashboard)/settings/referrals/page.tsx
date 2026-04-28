import { createClient } from '@/lib/supabase/server'

export default async function ReferralsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: referrals }] = await Promise.all([
    supabase.from('profiles').select('referral_code, pro_features_used').eq('id', user!.id).single(),
    supabase.from('referrals').select('id, status, created_at, reward_granted_at').eq('referrer_id', user!.id).order('created_at', { ascending: false }),
  ])

  const code = profile?.referral_code ?? ''
  const url = `https://clinidex.co.uk/signup?ref=${code}`
  const completed = referrals?.filter(ref => ref.status === 'completed').length ?? 0
  const proUntil = profile?.pro_features_used?.referral_pro_until ?? null

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight mb-2">Referrals</h1>
      <p className="text-sm text-[rgba(245,245,242,0.45)] mb-6">Completed onboarding by a referred user gives both accounts one month of Pro access.</p>

      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <p className="text-xs uppercase tracking-wide text-[rgba(245,245,242,0.45)] mb-2">Your referral link</p>
        <div className="rounded-xl bg-[#0B0B0C] border border-white/[0.08] p-4 font-mono text-sm text-[#F5F5F2] break-all">{url}</div>
        <p className="mt-3 text-sm text-[rgba(245,245,242,0.45)]">{completed} completed referrals. {proUntil ? `Referral Pro until ${new Date(proUntil).toLocaleDateString('en-GB')}.` : 'No referral Pro time active.'}</p>
      </section>

      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl divide-y divide-white/[0.06]">
        {(referrals ?? []).length === 0 ? (
          <p className="p-6 text-sm text-[rgba(245,245,242,0.45)]">No referrals yet.</p>
        ) : referrals!.map(ref => (
          <div key={ref.id} className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#F5F5F2] capitalize">{ref.status}</p>
              <p className="text-xs text-[rgba(245,245,242,0.35)]">{new Date(ref.created_at).toLocaleDateString('en-GB')}</p>
            </div>
            {ref.reward_granted_at && <span className="text-xs text-[#1B6FD9]">Reward granted</span>}
          </div>
        ))}
      </section>
    </div>
  )
}
