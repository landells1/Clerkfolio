import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { fetchSubscriptionInfo } from '@/lib/subscription'
import BillingActionButton from '@/components/upgrade/billing-action-button'
import { PRICING_FEATURES, PRICING_TIERS } from '@/lib/marketing/pricing'

export default async function UpgradePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const subInfo = await fetchSubscriptionInfo(supabase, user!.id)

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 max-w-3xl">
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.18em] text-[#1B6FD9]">Upgrade</p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#F5F5F2]">Plans and limits</h1>
        <p className="mt-2 text-sm leading-6 text-[rgba(245,245,242,0.55)]">
          Compare what each tier includes. Your current plan is <span className="font-medium text-[#F5F5F2]">{planLabel(subInfo.tier)}</span>.
        </p>
      </div>

      <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {PRICING_TIERS.map(tier => (
          <div
            key={tier.name}
            className={`rounded-2xl border p-5 ${
              tier.highlight
                ? 'border-[#1B6FD9]/45 bg-[#1B6FD9]/10'
                : 'border-white/[0.08] bg-[#141416]'
            }`}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#F5F5F2]">{tier.name}</h2>
                <p className="mt-1 text-sm text-[rgba(245,245,242,0.5)]">{tier.description}</p>
              </div>
              {subInfo.tier === tier.name.toLowerCase() && (
                <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-xs font-medium text-[#F5F5F2]">Current</span>
              )}
            </div>
            <p className="text-2xl font-semibold text-[#F5F5F2]">{tier.price}</p>
            <p className="mt-2 text-sm text-[rgba(245,245,242,0.55)]">{tier.storage} storage</p>
            {tier.name === 'Pro' && (
              <div className="mt-5">
                <BillingActionButton isPro={subInfo.isPro} />
              </div>
            )}
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-white/[0.08] bg-[#141416] p-5">
          <h2 className="mb-4 text-base font-semibold text-[#F5F5F2]">Upgrade checklist</h2>
          <div className="space-y-3">
            <ChecklistItem done={subInfo.isPro} label="Unlock unlimited exports" />
            <ChecklistItem done={subInfo.isPro} label="Create more portfolio share links" />
            <ChecklistItem done={subInfo.isPro} label="Track multiple specialty applications" />
            <ChecklistItem done={subInfo.isPro} label="Increase evidence storage to 5 GB" />
          </div>
          <Link href="/settings/referrals" className="mt-5 inline-flex text-sm font-medium text-[#6AA8FF] hover:text-[#F5F5F2]">
            View referral rewards
          </Link>
        </section>

        <section className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#141416]">
          <table className="min-w-[760px] w-full border-collapse text-left text-sm">
            <thead className="border-b border-white/[0.08] text-xs uppercase tracking-wide text-[rgba(245,245,242,0.45)]">
              <tr>
                <th className="px-5 py-4 font-medium">Feature</th>
                <th className="px-5 py-4 font-medium">Free</th>
                <th className="px-5 py-4 font-medium">Student</th>
                <th className="px-5 py-4 font-medium">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {PRICING_FEATURES.map(feature => (
                <tr key={feature.label} className="align-top">
                  <td className="px-5 py-4 font-medium text-[#F5F5F2]">{feature.label}</td>
                  <FeatureCell value={feature.free} />
                  <FeatureCell value={feature.student} />
                  <FeatureCell value={feature.pro} />
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) {
    return <td className="px-5 py-4 text-[#6AA8FF]">Included</td>
  }
  if (value === false) {
    return <td className="px-5 py-4 text-[rgba(245,245,242,0.35)]">Not included</td>
  }

  return <td className="px-5 py-4 text-[rgba(245,245,242,0.68)]">{value}</td>
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${done ? 'border-[#1B6FD9] bg-[#1B6FD9] text-[#0B0B0C]' : 'border-white/[0.14] text-[rgba(245,245,242,0.38)]'}`}>
        {done ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : null}
      </span>
      <span className="text-sm leading-6 text-[rgba(245,245,242,0.68)]">{label}</span>
    </div>
  )
}

function planLabel(tier: string) {
  if (tier === 'pro') return 'Pro'
  if (tier === 'student') return 'Student'
  if (tier === 'foundation') return 'Foundation'
  return 'Free'
}
