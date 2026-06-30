import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { fetchSubscriptionInfo, planProvenance } from '@/lib/subscription'
import BillingActionButton from '@/components/upgrade/billing-action-button'
import MemberDiscountCard from '@/components/upgrade/member-discount-card'
import { PRICING_FEATURES, PRICING_TIERS } from '@/lib/marketing/pricing'

export default async function UpgradePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const subInfo = await fetchSubscriptionInfo(supabase, user!.id)
  const provenance = planProvenance(subInfo)

  // "Current" badge: Pro card for any effective Pro; the verified card when
  // institution-verified-but-not-Pro; otherwise the Free card.
  const currentTierName = subInfo.isPro ? 'Pro' : subInfo.isVerified ? 'Verified' : 'Free'

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 max-w-3xl">
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.18em] text-[var(--accent-text)]">Upgrade</p>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Plans and limits</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Compare what each tier includes. Your current plan is <span className="font-medium text-[var(--text-primary)]">{provenance.label}</span>.
        </p>
      </div>

      {subInfo.isMedStudent && (
        <section className="mb-6 rounded-2xl border border-[#1B6FD9]/30 bg-[#1B6FD9]/10 p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Pro is optional for medical students</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Pro is optional for medical students - most stay on the free / student tier until they graduate.
            Upgrade now if you want extra storage or unlimited share links.
          </p>
        </section>
      )}

      <MemberDiscountCard />

      <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {PRICING_TIERS.map(tier => (
          <div
            key={tier.name}
            className={`rounded-2xl border p-5 ${
              tier.highlight
                ? 'border-[#1B6FD9]/45 bg-[#1B6FD9]/10'
                : 'border-white/[0.08] bg-[var(--bg-surface)]'
            }`}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">{tier.name}</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{tier.description}</p>
              </div>
              {currentTierName === tier.name && (
                <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)]">Current</span>
              )}
            </div>
            <p className="text-2xl font-semibold text-[var(--text-primary)]">{tier.price}</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{tier.storage} storage</p>
            {tier.name === 'Pro' && (
              <div className="mt-5">
                <BillingActionButton hasStripeBilling={provenance.hasStripeBilling} label={provenance.billingLabel} />
              </div>
            )}
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
          <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">Upgrade checklist</h2>
          <div className="space-y-3">
            <ChecklistItem done={subInfo.isPro} label="Unlock unlimited exports" />
            <ChecklistItem done={subInfo.isPro} label="Create more portfolio share links" />
            <ChecklistItem done={subInfo.isPro} label="Track multiple specialty applications" />
            <ChecklistItem done={subInfo.isPro} label="Increase evidence storage to 5 GB" />
          </div>
          <Link href="/settings/referrals" className="mt-5 inline-flex text-sm font-medium text-[var(--accent-text)] hover:text-[var(--text-primary)]">
            View referral rewards
          </Link>
        </section>

        <section className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)]">
          <table className="min-w-[760px] w-full border-collapse text-left text-sm">
            <thead className="border-b border-white/[0.08] text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="px-5 py-4 font-medium">Feature</th>
                <th className="px-5 py-4 font-medium">Free</th>
                <th className="px-5 py-4 font-medium">Verified</th>
                <th className="px-5 py-4 font-medium">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {PRICING_FEATURES.map(feature => (
                <tr key={feature.label} className="align-top">
                  <td className="px-5 py-4 font-medium text-[var(--text-primary)]">{feature.label}</td>
                  <FeatureCell value={feature.free} />
                  <FeatureCell value={feature.verified} />
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
    return <td className="px-5 py-4 text-[var(--accent-text)]">Included</td>
  }
  if (value === false) {
    return <td className="px-5 py-4 text-[var(--text-secondary)]">Not included</td>
  }

  return <td className="px-5 py-4 text-[var(--text-secondary)]">{value}</td>
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${done ? 'border-[var(--accent)] bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]' : 'border-white/[0.14] text-[var(--text-secondary)]'}`}>
        {done ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : null}
      </span>
      <span className="text-sm leading-6 text-[var(--text-secondary)]">{label}</span>
    </div>
  )
}

