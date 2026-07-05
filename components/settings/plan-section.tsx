'use client'

import Link from 'next/link'
import { planProvenance, formatStorageQuota, type SubscriptionInfo } from '@/lib/subscription'
import { VERIFIED_BONUS_MB, REFERRAL_STORAGE_BONUS_MB, REFERRAL_STORAGE_BONUS_AT } from '@/lib/entitlements/limits'
import BillingActionButton from '@/components/upgrade/billing-action-button'
import StorageMeter from '@/components/upgrade/storage-meter'

export function PlanSection({ subInfo }: { subInfo: SubscriptionInfo | null }) {
  return (
    <section className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-6 mb-6">
      <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">Plan</h2>
      {subInfo && (() => {
        const provenance = planProvenance(subInfo)
        const pdfAllowance = subInfo.isPro ? 'unlimited' : String(1 + subInfo.referralCount)
        const shareAllowance = subInfo.isPro ? 'unlimited' : String(1 + subInfo.referralCount)
        return (
          <div className="space-y-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                <p>
                  <span className="text-[var(--text-primary)] font-medium">{provenance.label}</span>
                  <span> · {formatStorageQuota(subInfo.storageQuotaMB)} storage</span>
                </p>
                {subInfo.isVerified && (
                  <p className="text-xs text-[var(--accent-text)]">Institution verified · +{VERIFIED_BONUS_MB} MB storage</p>
                )}
                {subInfo.referralCount > 0 && !subInfo.isPro && (
                  <p className="text-xs text-[var(--accent-text)]">
                    {subInfo.referralCount} referral{subInfo.referralCount === 1 ? '' : 's'} · +{subInfo.referralCount} PDF export{subInfo.referralCount === 1 ? '' : 's'}, +{subInfo.referralCount} share link{subInfo.referralCount === 1 ? '' : 's'}
                    {subInfo.referralCount >= REFERRAL_STORAGE_BONUS_AT ? `, +${REFERRAL_STORAGE_BONUS_MB} MB` : ''}
                  </p>
                )}
                <p>PDF exports used: {subInfo.usage.pdfExportsUsed} / {pdfAllowance}</p>
                <p>Share links used: {subInfo.usage.shareLinksUsed} / {shareAllowance}</p>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <Link href="/upgrade" className="min-h-[44px] rounded-lg bg-[var(--button-primary-bg)] px-5 py-2.5 text-center text-sm font-semibold text-[var(--button-primary-text)] hover:bg-[var(--button-primary-bg-hover)]">
                  View plans
                </Link>
                <BillingActionButton hasStripeBilling={provenance.hasStripeBilling} label={provenance.billingLabel} />
              </div>
            </div>
            <StorageMeter usedMB={subInfo.usage.storageUsedMB} quotaMB={subInfo.storageQuotaMB} />
          </div>
        )
      })()}
    </section>
  )
}
