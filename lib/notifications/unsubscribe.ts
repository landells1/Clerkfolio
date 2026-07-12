import { createHmac, timingSafeEqual } from 'crypto'

// One-click email unsubscribe that works WITHOUT a login. Every bulk email
// (weekly/monthly digest, daily reminders) carries a signed link back to
// `/unsubscribe` (+ RFC 8058 List-Unsubscribe headers) that flips the relevant
// notification_preferences off. The token is a stateless HMAC of
// `${userId}:${list}` so there is no per-user secret to store or migrate.

// Each "list" maps to one or more notification_preferences keys (the same keys
// the Settings → Notifications page toggles). Keep these in sync with
// DEFAULT_PREFS in app/(dashboard)/settings/notifications/page.tsx.
export const UNSUBSCRIBE_LISTS = {
  weekly_digest: ['weekly_digest'],
  monthly_digest: ['monthly_digest'],
  reminders: ['deadlines', 'share_link_expiring', 'application_window', 'activity_nudge'],
  all: ['weekly_digest', 'monthly_digest', 'deadlines', 'share_link_expiring', 'application_window', 'activity_nudge'],
} as const

export type UnsubscribeList = keyof typeof UNSUBSCRIBE_LISTS

export const UNSUBSCRIBE_LIST_LABELS: Record<UnsubscribeList, string> = {
  weekly_digest: 'weekly digest emails',
  monthly_digest: 'monthly digest emails',
  reminders: 'reminder emails (deadlines, expiring share links, application windows, and nudges)',
  all: 'all Clerkfolio emails',
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clerkfolio.co.uk'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Dedicated secret is optional: fall back to secrets that are already
// provisioned in every environment so the feature works with zero owner action.
// Rotating whichever secret is in use simply invalidates unsubscribe links in
// already-sent mail (users can still use the in-app settings page) — low harm.
function getSecret(): string | null {
  return process.env.UNSUBSCRIBE_SECRET || process.env.SHARE_IP_HASH_SALT || process.env.CRON_SECRET || null
}

function b64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(input: string): string {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
}

export function signUnsubscribeToken(userId: string, list: UnsubscribeList): string | null {
  const secret = getSecret()
  if (!secret) return null
  const payload = b64url(`${userId}:${list}`)
  const sig = createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${sig}`
}

export function verifyUnsubscribeToken(token: unknown): { userId: string; list: UnsubscribeList } | null {
  const secret = getSecret()
  if (!secret || typeof token !== 'string' || !token.includes('.')) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null

  const expected = createHmac('sha256', secret).update(payload).digest('hex')
  const a = Buffer.from(sig, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length === 0 || a.length !== b.length || !timingSafeEqual(a, b)) return null

  const decoded = b64urlDecode(payload)
  const idx = decoded.lastIndexOf(':')
  if (idx < 0) return null
  const userId = decoded.slice(0, idx)
  const list = decoded.slice(idx + 1)
  if (!UUID_RE.test(userId) || !(list in UNSUBSCRIBE_LISTS)) return null
  return { userId, list: list as UnsubscribeList }
}

// Absolute URL to the confirmation page for a visible "Unsubscribe" link.
export function unsubscribeUrl(userId: string, list: UnsubscribeList): string | null {
  const token = signUnsubscribeToken(userId, list)
  return token ? `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}` : null
}

// Pure merge used by the API route: returns the notification_preferences object
// with every key in the chosen list set to false. Never mutates its input.
export function applyUnsubscribe(
  current: Record<string, unknown> | null | undefined,
  list: UnsubscribeList,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(current ?? {}) }
  for (const key of UNSUBSCRIBE_LISTS[list]) next[key] = false
  return next
}
