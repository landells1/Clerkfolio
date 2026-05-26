'use client'

import { OPEN_CONSENT_EVENT } from '@/lib/consent'

export default function CookiePreferencesButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
      className={className}
    >
      Analytics preferences
    </button>
  )
}
