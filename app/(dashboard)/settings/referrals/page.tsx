import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ensureFiveLetterReferralCode } from '@/lib/referrals/codes'
import Link from 'next/link'

export default async function ReferralsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: referrals }] = await Promise.all([
    supabase.from('profiles').select('referral_code, pro_features_used, student_email_verified, student_email_verification_due_at').eq('id', user!.id).single(),
    supabase.from('referrals').select('id, status, created_at, reward_granted_at').eq('referrer_id', user!.id).order('created_at', { ascending: false }),
  ])

  const code = await ensureFiveLetterReferralCode(createServiceClient(), user!.id, profile?.referral_code)
  const url = `https://clerkfolio.co.uk/r/${code}`
  const completed = referrals?.filter(ref => ref.status === 'completed').length ?? 0
  const pending = referrals?.filter(ref => ref.status === 'pending').length ?? 0
  const proUntil = profile?.pro_features_used?.referral_pro_until ?? null
  const institutionVerified = Boolean(profile?.student_email_verified) && (
    !profile?.student_email_verification_due_at ||
    new Date(`${profile.student_email_verification_due_at}T23:59:59.999Z`).getTime() >= Date.now()
  )

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors" aria-label="Back to settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight mb-2">Referrals</h1>
          <p className="text-sm text-[rgba(245,245,242,0.45)]">Both accounts get one month of Pro when the referred user completes onboarding and both users have verified institutional emails.</p>
        </div>
      </div>

      {!institutionVerified && (
        <section className="mb-6 rounded-2xl border border-[#1B6FD9]/25 bg-[#1B6FD9]/10 p-5">
          <h2 className="mb-2 text-sm font-semibold text-[#F5F5F2]">Verify your institutional email</h2>
          <p className="text-sm leading-6 text-[rgba(245,245,242,0.68)]">
            Referral rewards stay pending until you verify a .ac.uk, NHS, or HSC email in Settings.
          </p>
          <Link href="/settings" className="mt-3 inline-flex text-sm font-medium text-[#6AA8FF] hover:text-[#F5F5F2]">
            Go to settings
          </Link>
        </section>
      )}

      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <p className="text-xs uppercase tracking-wide text-[rgba(245,245,242,0.45)] mb-2">Your referral code</p>
        <p className="mb-4 text-3xl font-semibold tracking-[0.18em] text-[#F5F5F2]">{code}</p>
        <p className="text-xs uppercase tracking-wide text-[rgba(245,245,242,0.45)] mb-2">Your referral link</p>
        <div className="rounded-xl bg-[#0B0B0C] border border-white/[0.08] p-4 font-mono text-sm text-[#F5F5F2] break-all">{url}</div>
        <p className="mt-3 text-sm text-[rgba(245,245,242,0.45)]">
          {completed} completed referrals. {pending} pending. {proUntil ? `Referral Pro until ${new Date(proUntil).toLocaleDateString('en-GB')}.` : 'No referral Pro time active.'}
        </p>
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
