'use client'

import { useEffect, useState } from 'react'

/**
 * Lightweight banner that appears at the top of the dashboard when the
 * browser reports it has lost network connectivity. The service worker's
 * SHELL_CACHE keeps the page itself viewable; this widget just tells the
 * user that the underlying data may be stale and points them at the
 * pre-warmed offline-latest snapshot in localStorage so writes do not
 * silently disappear.
 *
 * Hydration-safe: initial state is `null` (server + first-paint client agree)
 * and the real value is filled in by the post-mount useEffect, so we cannot
 * trigger the React #418 hydration mismatch class that bit the dashboard
 * forms in the 2026-05-16 e2e session.
 */
export default function OfflineIndicator() {
  const [online, setOnline] = useState<boolean | null>(null)

  useEffect(() => {
    function update() { setOnline(navigator.onLine) }
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  if (online === null || online) return null

  return (
    <div role="status" aria-live="polite" className="sticky top-0 z-30 border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 text-center text-xs text-amber-200">
      You are offline. Some data may be out of date and new entries will not save until your connection returns.
    </div>
  )
}
