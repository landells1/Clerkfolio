'use client'

import { useState, useEffect } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { CONSENT_CHANGED_EVENT, getConsent } from '@/lib/consent'

export default function AnalyticsGate() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const consent = getConsent()
    setEnabled(consent?.analytics === true)

    function onStorage(e: StorageEvent) {
      if (e.key !== 'cf_consent_v1') return
      try {
        const data = e.newValue ? JSON.parse(e.newValue) : null
        setEnabled(data?.analytics === true)
      } catch {
        // ignore malformed storage
      }
    }
    window.addEventListener('storage', onStorage)
    const onConsentChanged = () => setEnabled(getConsent()?.analytics === true)
    window.addEventListener(CONSENT_CHANGED_EVENT, onConsentChanged)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(CONSENT_CHANGED_EVENT, onConsentChanged)
    }
  }, [])

  if (!enabled) return null
  return <Analytics />
}
