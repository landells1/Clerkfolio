'use client'

import { useEffect } from 'react'
import { apiFetch } from '@/lib/api-fetch'

export default function OfflineCachePrimer() {
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // apiFetch never throws, so offline priming can never block the dashboard.
      const { ok, data } = await apiFetch('/api/offline/latest', { cache: 'no-store' })
      if (!ok || cancelled || data == null) return
      localStorage.setItem('clerkfolio-offline-latest', JSON.stringify(data))
      navigator.serviceWorker?.controller?.postMessage({ type: 'WARM_OFFLINE_LATEST' })
    })()
    return () => { cancelled = true }
  }, [])

  return null
}
