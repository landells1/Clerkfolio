// localStorage throws (SecurityError) when the browser blocks site data, and
// can throw on quota. Every read/write here fails soft, so a visitor with
// "block all site data" gets a working page instead of the global error screen.
// Stored values are per-browser conveniences only - callers must cope with null.

export function storageGet(key: string): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function storageSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value)
  } catch {
    // Storage blocked or full: the preference simply isn't remembered.
  }
}

export function storageRemove(key: string): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key)
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
