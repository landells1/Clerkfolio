// Human-readable device labels for Settings > Sessions ("Chrome on Windows")
// instead of the raw user-agent string. Best-effort parsing only - it is a
// label, never used for any security decision.

function browserName(ua: string): string | null {
  if (/Edg\//.test(ua)) return 'Edge'
  if (/OPR\/|Opera/.test(ua)) return 'Opera'
  if (/SamsungBrowser\//.test(ua)) return 'Samsung Internet'
  if (/Firefox\/|FxiOS\//.test(ua)) return 'Firefox'
  if (/CriOS\//.test(ua)) return 'Chrome'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return 'Safari'
  return null
}

function deviceName(ua: string): string | null {
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Mac OS X|Macintosh/.test(ua)) return 'Mac'
  if (/CrOS/.test(ua)) return 'Chromebook'
  if (/Linux/.test(ua)) return 'Linux'
  return null
}

export function describeUserAgent(ua: string | null | undefined): string {
  if (!ua || ua === 'unknown') return 'Unknown browser'
  const browser = browserName(ua)
  const device = deviceName(ua)
  if (browser && device) return `${browser} on ${device}`
  if (browser) return browser
  if (device) return `Browser on ${device}`
  return 'Unknown browser'
}

/**
 * The Supabase `session_id` claim from an access-token JWT (no signature
 * check - this only labels the current row as "This device"; auth is
 * supabase.auth.getUser()). Shared with middleware's fingerprint scoping.
 */
export function readSessionIdFromJwt(token: string | undefined | null): string | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(atob(payload + '='.repeat((4 - payload.length % 4) % 4)))
    return typeof decoded?.session_id === 'string' ? decoded.session_id : null
  } catch {
    return null
  }
}
