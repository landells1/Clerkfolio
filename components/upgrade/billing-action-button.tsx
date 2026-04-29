'use client'

import { useState } from 'react'

export default function BillingActionButton({ isPro }: { isPro: boolean }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function openBilling() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(isPro ? '/api/stripe/portal' : '/api/stripe/checkout', { method: 'POST' })
      const body = await res.json()
      if (!res.ok || !body.url) throw new Error(body.error ?? 'Billing unavailable')
      window.location.href = body.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Billing unavailable')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={openBilling}
        disabled={loading}
        className="min-h-[44px] w-full rounded-lg bg-[#1B6FD9] px-5 py-2.5 text-sm font-semibold text-[#0B0B0C] hover:bg-[#155BB0] disabled:opacity-50 sm:w-auto"
      >
        {loading ? 'Opening...' : isPro ? 'Manage billing' : 'Upgrade to Pro'}
      </button>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  )
}
