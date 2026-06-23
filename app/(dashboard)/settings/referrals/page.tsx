import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ensureFiveLetterReferralCode } from '@/lib/referrals/codes'
import {
  REFERRAL_LADDER,
  REFERRAL_STORAGE_BONUS_MB,
  REFERRAL_STORAGE_BONUS_AT,
  isFoundingSharerWindowOpen,
} from '@/lib/referrals/constants'
import Link from 'next/link'

type ReferralRow = { id: string; status: string; created_at: string; activated_at: string | null; reward_granted_at: string | null }

export default async function ReferralsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: referrals }] = await Promise.all([
    supabase.from('profiles')
      .select('referral_code, referral_badges, student_email_verified, student_email_verification_due_at')
      .eq('id', user!.id).single(),
    supabase.from('referrals')
      .select('id, status, created_at, activated_at, reward_granted_at')
      .eq('referrer_id', user!.id)
      .order('created_at', { ascending: false })
      .returns<ReferralRow[]>(),
  ])

  const code = await ensureFiveLetterReferralCode(createServiceClient(), user!.id, profile?.referral_code)
  const url = `https://clerkfolio.co.uk/r/${code}`

  const rows = referrals ?? []
  const signups = rows.length
  const activated = rows.filter(r => r.activated_at).length
  const rewarded = rows.filter(r => r.status === 'completed').length
  const pending = rows.filter(r => r.status === 'pending').length

  const earnedBadges = new Set<string>(profile?.referral_badges ?? [])
  const foundingEarned = earnedBadges.has('founding_sharer')

  const institutionVerified = Boolean(profile?.student_email_verified) && (
    !profile?.student_email_verification_due_at ||
    new Date(`${profile.student_email_verification_due_at}T23:59:59.999Z`).getTime() >= Date.now()
  )

  const nextRung = REFERRAL_LADDER.find(b => rewarded < b.threshold)
  const topThreshold = REFERRAL_LADDER[REFERRAL_LADDER.length - 1].threshold
  const ladderProgressPct = Math.min(100, (rewarded / topThreshold) * 100)

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors" aria-label="Back to settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight mb-2">Referrals</h1>
          <p className="text-sm leading-6 text-[rgba(245,245,242,0.55)]">
            Share Clerkfolio with colleagues. When someone joins on your link and logs their first case, you earn
            recognition badges plus <span className="text-[#F5F5F2]">+1 PDF export and +1 share link</span> per referral,
            and <span className="text-[#F5F5F2]">+{REFERRAL_STORAGE_BONUS_MB} MB of permanent storage at {REFERRAL_STORAGE_BONUS_AT} referrals</span>.
            Rewards have no cash value and may be revoked for abuse.
          </p>
        </div>
      </div>

      {!institutionVerified && (
        <section className="mb-6 rounded-2xl border border-[#1B6FD9]/25 bg-[#1B6FD9]/10 p-5">
          <h2 className="mb-2 text-sm font-semibold text-[#F5F5F2]">Verify your institutional email to earn rewards</h2>
          <p className="text-sm leading-6 text-[rgba(245,245,242,0.68)]">
            Your referrals are tracked from day one, but rewards only pay out once you have verified a .ac.uk, NHS, or HSC
            email. Your friends don&apos;t need to be verified.
          </p>
          <Link href="/settings" className="mt-3 inline-flex text-sm font-medium text-[#6AA8FF] hover:text-[#F5F5F2]">
            Go to settings
          </Link>
        </section>
      )}

      {/* Code + link */}
      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <p className="text-xs uppercase tracking-wide text-[rgba(245,245,242,0.45)] mb-2">Your referral code</p>
        <p className="mb-4 text-3xl font-semibold tracking-[0.18em] text-[#F5F5F2]">{code}</p>
        <p className="text-xs uppercase tracking-wide text-[rgba(245,245,242,0.45)] mb-2">Your referral link</p>
        <div className="rounded-xl bg-[#0B0B0C] border border-white/[0.08] p-4 font-mono text-sm text-[#F5F5F2] break-all">{url}</div>
      </section>

      {/* Funnel */}
      <section className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Signed up" value={signups} />
        <Stat label="Activated" value={activated} hint="Onboarded + first case" />
        <Stat label="Rewarded" value={rewarded} hint="Vested after 7 days" />
      </section>

      {/* Reward ladder */}
      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-[#F5F5F2]">Reward ladder</h2>
          <span className="text-xs text-[rgba(245,245,242,0.55)]">{rewarded} rewarded referral{rewarded === 1 ? '' : 's'}</span>
        </div>
        <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
          <div className="h-full rounded-full bg-[#1B6FD9] transition-[width]" style={{ width: `${ladderProgressPct}%` }} />
        </div>
        <ul className="space-y-3">
          {REFERRAL_LADDER.map(badge => {
            const earned = rewarded >= badge.threshold
            return (
              <li key={badge.key} className="flex items-start gap-3">
                <span className={`mt-0.5 text-lg ${earned ? '' : 'grayscale opacity-40'}`} aria-hidden>{badge.emoji}</span>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${earned ? 'text-[#F5F5F2]' : 'text-[rgba(245,245,242,0.55)]'}`}>
                    {badge.label} · {badge.threshold} referral{badge.threshold === 1 ? '' : 's'}
                    {earned && <span className="ml-2 text-xs text-[#6AA8FF]">Earned</span>}
                  </p>
                  <p className="text-xs leading-5 text-[rgba(245,245,242,0.5)]">{badge.description}</p>
                </div>
              </li>
            )
          })}
        </ul>
        {nextRung && (
          <p className="mt-4 text-sm text-[rgba(245,245,242,0.6)]">
            {nextRung.threshold - rewarded} more to reach <span className="text-[#F5F5F2]">{nextRung.label}</span>.
          </p>
        )}
        {(foundingEarned || isFoundingSharerWindowOpen()) && (
          <div className="mt-5 rounded-xl border border-[#1B6FD9]/25 bg-[#1B6FD9]/10 p-4">
            <p className="text-sm font-medium text-[#F5F5F2]">🚀 Founding Sharer {foundingEarned ? '· Earned' : '· Limited time'}</p>
            <p className="mt-1 text-xs leading-5 text-[rgba(245,245,242,0.6)]">
              {foundingEarned
                ? 'Thank you for sharing Clerkfolio during launch.'
                : 'Land a rewarded referral during launch to earn the limited-edition Founding Sharer badge.'}
            </p>
          </div>
        )}
      </section>

      {/* Current rewards */}
      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="mb-3 text-base font-semibold text-[#F5F5F2]">Your rewards</h2>
        <ul className="space-y-2 text-sm text-[rgba(245,245,242,0.6)]">
          <li>+{rewarded} PDF export{rewarded === 1 ? '' : 's'} and +{rewarded} share link{rewarded === 1 ? '' : 's'} added to your free allowance.</li>
          <li className={rewarded >= REFERRAL_STORAGE_BONUS_AT ? 'text-[#6AA8FF]' : ''}>
            +{REFERRAL_STORAGE_BONUS_MB} MB permanent storage at {REFERRAL_STORAGE_BONUS_AT} referrals —{' '}
            {rewarded >= REFERRAL_STORAGE_BONUS_AT ? 'unlocked.' : `${REFERRAL_STORAGE_BONUS_AT - rewarded} to go.`}
          </li>
        </ul>
      </section>

      {/* Referral list */}
      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl divide-y divide-white/[0.06]">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-[rgba(245,245,242,0.45)]">No referrals yet. Share your link to get started.</p>
        ) : rows.map(ref => (
          <div key={ref.id} className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#F5F5F2]">{statusLabel(ref.status)}</p>
              <p className="text-xs text-[rgba(245,245,242,0.55)]">Joined {new Date(ref.created_at).toLocaleDateString('en-GB')}</p>
            </div>
            {ref.reward_granted_at
              ? <span className="text-xs text-[#6AA8FF]">Rewarded</span>
              : ref.activated_at
                ? <span className="text-xs text-[rgba(245,245,242,0.55)]">Vesting</span>
                : null}
          </div>
        ))}
      </section>

      {pending > 0 && (
        <p className="mt-4 text-xs text-[rgba(245,245,242,0.45)]">
          {pending} referral{pending === 1 ? '' : 's'} awaiting activation (they need to onboard and log their first case).
        </p>
      )}
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#141416] p-4 text-center">
      <p className="text-2xl font-semibold text-[#F5F5F2]">{value}</p>
      <p className="text-xs font-medium text-[rgba(245,245,242,0.6)]">{label}</p>
      {hint && <p className="mt-0.5 text-[10px] text-[rgba(245,245,242,0.4)]">{hint}</p>}
    </div>
  )
}

function statusLabel(status: string) {
  if (status === 'completed') return 'Rewarded'
  if (status === 'activated') return 'Activated'
  return 'Signed up'
}
