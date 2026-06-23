import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import BillingActionButton from '@/components/upgrade/billing-action-button'
import { fetchSubscriptionInfo, planProvenance } from '@/lib/subscription'

export default async function BillingSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const subInfo = user ? await fetchSubscriptionInfo(supabase, user.id) : null
  const provenance = subInfo ? planProvenance(subInfo) : null

  return (
    <div className="mx-auto max-w-2xl p-6 lg:p-8">
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-[rgba(245,245,242,0.5)] transition-colors hover:text-[#F5F5F2]">
          ← Back to settings
        </Link>
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-[#141416] p-6">
        <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Billing</h1>
        <p className="mt-2 text-sm text-[rgba(245,245,242,0.45)]">
          Open Stripe checkout to upgrade, or manage your existing subscription in the billing portal.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <p className="text-sm text-[rgba(245,245,242,0.6)]">
            Current plan: <span className="font-medium text-[#F5F5F2]">{provenance?.label ?? 'Free'}</span>
          </p>
          <BillingActionButton hasStripeBilling={provenance?.hasStripeBilling ?? false} label={provenance?.billingLabel} />
        </div>
      </section>
    </div>
  )
}
