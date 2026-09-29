import { storageGet, storageSet, storageRemove } from '@/lib/safe-storage'
export type ConsentData = {
  analytics: boolean
  ts: string
  version: 1
}

const KEY = 'cf_consent_v1'
export const OPEN_CONSENT_EVENT = 'cf-open-consent-preferences'
export const CONSENT_CHANGED_EVENT = 'cf-consent-changed'

export function getConsent(): ConsentData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = storageGet(KEY)
    if (!raw) return null
    return JSON.parse(raw) as ConsentData
  } catch {
    return null
  }
}

export function setConsent(analytics: boolean): ConsentData {
  const data: ConsentData = { analytics, ts: new Date().toISOString(), version: 1 }
  storageSet(KEY, JSON.stringify(data))
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: data }))
  return data
}

export function clearConsent(): void {
  if (typeof window !== 'undefined') storageRemove(KEY)
}

export function hasConsent(): boolean {
  return getConsent() !== null
}
