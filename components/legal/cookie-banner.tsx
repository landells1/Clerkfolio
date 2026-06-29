'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getConsent, OPEN_CONSENT_EVENT, setConsent } from '@/lib/consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const [customising, setCustomising] = useState(false)
  const [analyticsOn, setAnalyticsOn] = useState(false)

  useEffect(() => {
    function openPreferences() {
      const consent = getConsent()
      setAnalyticsOn(consent?.analytics === true)
      setCustomising(true)
      setVisible(true)
    }
    window.addEventListener(OPEN_CONSENT_EVENT, openPreferences)
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, openPreferences)
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
      aria-label="Analytics preferences"
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t border-white/[0.08] bg-[var(--bg-canvas)] px-4 py-4 shadow-2xl sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-sm sm:rounded-2xl sm:border"
    >
      <p className="mb-1 text-sm font-semibold text-[var(--text-primary)]">Analytics preferences</p>
      <p className="mb-3 text-xs leading-6 text-[var(--text-secondary)]">
        Essential storage keeps you signed in. Optional Vercel Analytics is off unless you enable it.{' '}
        <Link href="/cookies" className="underline transition-colors hover:text-[var(--text-primary)]">
          Cookie policy
        </Link>
      </p>

      {customising && (
        <div className="mb-3 space-y-2.5 rounded-xl border border-white/[0.08] bg-[var(--bg-surface)] px-3 py-3">
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
          className="flex-1 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          Accept all
        </button>
        <button
          onClick={reject}
          className="flex-1 rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-white/[0.18] hover:text-[var(--text-primary)]"
        >
          Reject non-essential
        </button>
        <button
          onClick={save}
          className="w-full rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-white/[0.18] hover:text-[var(--text-primary)]"
        >
          Save preferences
        </button>
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
        <p className="text-xs font-medium text-[var(--text-primary)]">{label}</p>
        <p className="text-[10px] leading-5 text-[var(--text-secondary)]">{description}</p>
      </div>
      {locked ? (
        <span className="mt-0.5 shrink-0 text-[10px] text-[var(--text-muted)]">Always on</span>
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange?.(!checked)}
          className={`mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors ${
            checked ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-white/[0.16] bg-white/[0.06]'
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
