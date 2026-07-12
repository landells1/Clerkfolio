'use client'

import { useState } from 'react'
import Link from 'next/link'

type State = 'idle' | 'loading' | 'done' | 'error'

// A confirm button rather than an on-load action: mail scanners and link
// prefetchers issue GET requests to the visible link, so the actual opt-out is
// a deliberate POST the user triggers here. (Provider-driven one-click
// unsubscribe uses the RFC 8058 List-Unsubscribe-Post header, which hits the
// same API route directly.)
export function UnsubscribeConfirm({ token }: { token: string }) {
  const [state, setState] = useState<State>('idle')

  async function submit() {
    setState('loading')
    try {
      const res = await fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`, { method: 'POST' })
      setState(res.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div className="mt-5 rounded-lg border border-pill-green bg-pill-green p-4">
        <p className="text-sm font-medium text-fg">You&apos;re unsubscribed.</p>
        <p className="mt-1 text-sm text-fg-2">You won&apos;t receive these emails anymore. Manage all preferences in <Link href="/settings/notifications" className="text-[var(--accent-text)] underline">notification settings</Link>.</p>
      </div>
    )
  }

  return (
    <div className="mt-5 space-y-3">
      {state === 'error' && (
        <p className="rounded-lg border border-pill-rose bg-pill-rose px-4 py-3 text-sm text-[var(--cat-rose-text)]">
          Something went wrong. Please try again, or manage preferences from your notification settings.
        </p>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={state === 'loading'}
        className="w-full rounded-lg bg-[var(--button-primary-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--button-primary-text)] hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-50 transition-colors"
      >
        {state === 'loading' ? 'Unsubscribing…' : 'Confirm unsubscribe'}
      </button>
    </div>
  )
}
