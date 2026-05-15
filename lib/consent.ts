export type ConsentData = {
  analytics: boolean
  ts: string
  version: 1
}

const KEY = 'cf_consent_v1'

export function getConsent(): ConsentData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as ConsentData
  } catch {
    return null
  }
}

export function setConsent(analytics: boolean): ConsentData {
  const data: ConsentData = { analytics, ts: new Date().toISOString(), version: 1 }
  localStorage.setItem(KEY, JSON.stringify(data))
  return data
}

export function clearConsent(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(KEY)
}

export function hasConsent(): boolean {
  return getConsent() !== null
}
