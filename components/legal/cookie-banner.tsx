'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getConsent, setConsent } from '@/lib/consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const [customising, setCustomising] = useState(false)
  const [analyticsOn, setAnalyticsOn] = useState(false)

  useEffect(() => {
    if (getConsent() !== null) return
    // Respect Do Not Track as default-off for analytics
    const dnt = typeof navigator !== 'undefined' && navigator.doNotTrack === '1'
    setAnalyticsOn(!dnt)
    setVisible(true)
  }, [])

  if (!visible) return null

  function accept() {
    setConsent(true)
    setVisible(false)
  }

  function reject() {
    setConsent(false)
    setVisible(false)
  }

  function save() {
    setConsent(analyticsOn)
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cookie preferences"
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t border-white/[0.08] bg-[#0E0E10] px-4 py-4 shadow-2xl sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-sm sm:rounded-2xl sm:border"
    >
      <p className="mb-1 text-sm font-semibold text-[#F5F5F2]">We use cookies</p>
      <p className="mb-3 text-xs leading-6 text-[rgba(245,245,242,0.68)]">
        Clerkfolio uses essential cookies to keep you signed in. We also use Vercel Analytics to
        understand aggregate usage - these are off by default.{' '}
        <Link href="/cookies" className="underline transition-colors hover:text-[#F5F5F2]">
          Cookie policy
        </Link>
      </p>

      {customising && (
        <div className="mb-3 space-y-2.5 rounded-xl border border-white/[0.08] bg-[#141416] px-3 py-3">
          <CategoryRow
            label="Strictly necessary"
            description="Supabase auth session cookies and CSRF protection. Required for the service to function."
            locked
          />
          <CategoryRow
            label="Analytics"
            description="Vercel Analytics - aggregate, anonymised page-view data. No cross-site tracking."
            checked={analyticsOn}
            onChange={setAnalyticsOn}
          />
          <CategoryRow
            label="Payment"
            description="Stripe checkout scripts, loaded only on the upgrade page when you choose to subscribe. Strictly necessary at that point."
            locked
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={accept}
          className="flex-1 rounded-lg bg-[#1B6FD9] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#155BB0]"
        >
          Accept all
        </button>
        <button
          onClick={reject}
          className="flex-1 rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-semibold text-[rgba(245,245,242,0.72)] transition-colors hover:border-white/[0.18] hover:text-[#F5F5F2]"
        >
          Reject non-essential
        </button>
        {customising ? (
          <button
            onClick={save}
            className="w-full rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-semibold text-[rgba(245,245,242,0.72)] transition-colors hover:border-white/[0.18] hover:text-[#F5F5F2]"
          >
            Save preferences
          </button>
        ) : (
          <button
            onClick={() => setCustomising(true)}
            className="w-full rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-semibold text-[rgba(245,245,242,0.45)] transition-colors hover:text-[rgba(245,245,242,0.8)]"
          >
            Customise
          </button>
        )}
      </div>
    </div>
  )
}

function CategoryRow({
  label,
  description,
  locked,
  checked,
  onChange,
}: {
  label: string
  description: string
  locked?: boolean
  checked?: boolean
  onChange?: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[#F5F5F2]">{label}</p>
        <p className="text-[10px] leading-5 text-[rgba(245,245,242,0.5)]">{description}</p>
      </div>
      {locked ? (
        <span className="mt-0.5 shrink-0 text-[10px] text-[rgba(245,245,242,0.4)]">Always on</span>
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange?.(!checked)}
          className={`mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors ${
            checked ? 'border-[#1B6FD9] bg-[#1B6FD9]' : 'border-white/[0.16] bg-white/[0.06]'
          }`}
        >
          <span
            className={`block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      )}
    </div>
  )
}
