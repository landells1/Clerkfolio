'use client'

const SESSION_PATTERNS = [
  /^clerkfolio-.*-draft(?::.+)?$/,
  /^clerkfolio-share-pin:/,
]

const LOCAL_KEYS = [
  'clerkfolio-offline-latest',
  'portfolio-sort',
  'cases-sort',
  'cases-domain',
  'clerkfolio-cases-density',
  'clerkfolio-chart-view',
]

const LOCAL_PATTERNS = [
  /^clerkfolio-filters:/,
]

function removeMatching(storage: Storage, patterns: RegExp[]) {
  for (let index = storage.length - 1; index >= 0; index--) {
    const key = storage.key(index)
    if (key && patterns.some(pattern => pattern.test(key))) {
      storage.removeItem(key)
    }
  }
}

export function clearClientStateOnAuthChange() {
  if (typeof window === 'undefined') return

  try {
    removeMatching(window.sessionStorage, SESSION_PATTERNS)
  } catch {}

  try {
    LOCAL_KEYS.forEach(key => window.localStorage.removeItem(key))
    removeMatching(window.localStorage, LOCAL_PATTERNS)
  } catch {}

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' })
  }
}
