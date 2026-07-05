'use client'

import Link from 'next/link'

export function ReferralCodeSection({
  referralCode,
  origin,
  onCopy,
}: {
  referralCode: string
  origin: string
  onCopy: () => void
}) {
  return (
    <section className="bg-[var(--bg-surface)] border border-accent/12 rounded-2xl p-6 mb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--text-emphasis)] mb-2">Referral code</p>
          <h2 className="text-3xl font-semibold tracking-[0.18em] text-[var(--text-primary)]">{referralCode}</h2>
          <p className="mt-3 break-all text-sm text-[var(--text-muted)]">{origin ? `${origin}/r/${referralCode}` : `/r/${referralCode}`}</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <button
            type="button"
            onClick={onCopy}
            className="min-h-[44px] rounded-lg bg-[var(--button-primary-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--button-primary-text)] hover:bg-[var(--button-primary-bg-hover)]"
          >
            Copy link
          </button>
          <Link href="/settings/referrals" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            View referrals
          </Link>
        </div>
      </div>
    </section>
  )
}
