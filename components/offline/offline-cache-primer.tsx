'use client'

import { useEffect } from 'react'

export default function OfflineCachePrimer() {
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/offline/latest', { cache: 'no-store' })
        if (!res.ok || cancelled) return
        const payload = await res.json()
        localStorage.setItem('clerkfolio-offline-latest', JSON.stringify(payload))
        navigator.serviceWorker?.controller?.postMessage({ type: 'WARM_OFFLINE_LATEST' })
      } catch {
        // Offline priming should never block the dashboard.
      }
    })()
    return () => { cancelled = true }
  }, [])

  return null
}
