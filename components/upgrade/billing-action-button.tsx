'use client'

import { useState } from 'react'
import { apiFetch, NETWORK_ERROR_MESSAGE } from '@/lib/api-fetch'

// hasStripeBilling distinguishes a real (Stripe) subscriber - who gets the
// billing portal - from a non-subscriber (free user), who gets Stripe Checkout
// instead. Pro is buy-only, so there is no referral/gift Pro holder to consider.
// F-029: never send a non-subscriber to the portal (it dead-ends with no
// customer); route them to checkout instead.
export default function BillingActionButton({
  hasStripeBilling,
  label,
}: {
  hasStripeBilling: boolean
  label?: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buttonLabel = label ?? (hasStripeBilling ? 'Manage billing' : 'Upgrade to Pro')

  async function openBilling() {
    setLoading(true)
    setError(null)

    const { ok, status, data } = await apiFetch<{ url?: string; error?: string }>(
      hasStripeBilling ? '/api/stripe/portal' : '/api/stripe/checkout',
      { method: 'POST' },
    )
    if (ok && data?.url) {
      // Navigating away, so intentionally leave `loading` true.
      window.location.href = data.url
      return
    }
    setError(status === null ? NETWORK_ERROR_MESSAGE : (data?.error ?? 'Billing unavailable'))
    setLoading(false)
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={openBilling}
        disabled={loading}
        className="min-h-[44px] w-full rounded-lg bg-[var(--button-primary-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--button-primary-text)] hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-50 sm:w-auto"
      >
        {loading ? 'Opening...' : buttonLabel}
      </button>
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
    </div>
  )
}
