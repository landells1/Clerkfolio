import { formatCompetencyTheme } from '@/lib/types/portfolio-labels'
import { formatSpecialtyLabel } from '@/lib/specialties'
import { localIsoDate } from '@/lib/timeline/calendar-grid'

// Constants, types and pure helpers shared between the Import & export page
// and its tab components.

export type ExportFormat = 'pdf' | 'csv' | 'json'
export type PdfTemplate = 'default' | 'foundation' | 'mrcp' | 'st_application'
export type ShareScope = 'specialty' | 'theme' | 'full'

export const EXPIRY_PRESETS = [
  { label: '1 day', days: 1 },
  { label: '1 week', days: 7 },
  { label: '1 month', days: 30 },
  { label: 'Custom', days: null },
]
export const ALL_RECORDS = '__all_records__'
export const UNTAGGED_RECORDS = '__untagged_records__'

export const EXPORT_FIELDS = [
  { value: 'record_type', label: 'Type' },
  { value: 'id', label: 'ID' },
  { value: 'title', label: 'Title' },
  { value: 'category_or_area', label: 'Category / area' },
  { value: 'date', label: 'Date' },
  { value: 'specialty_tags', label: 'Specialty tags' },
  { value: 'notes', label: 'Notes' },
  { value: 'created_at', label: 'Created' },
]

export type ShareLink = {
  id: string
  token: string
  scope: ShareScope
  specialty_key: string | null
  theme_slug: string | null
  expires_at: string
  view_count: number
  hide_notes?: boolean
  hide_reflection?: boolean
  redact_tags?: boolean
  view_webhook_url?: string | null
  created_at: string
}
/** A revoked link, kept for history. No token: a revoked link is dead. */
export type RevokedShareLink = Omit<ShareLink, 'token'> & { revoked_at: string | null }
export type TrackedApp = { id: string; specialty_key: string }
export type TagCount = { tag: string; count: number }

export function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Local (UK) calendar date, not the UTC date - the UTC date is a day behind
// between 00:00 and 01:00 BST, which skewed the expiry picker's min/max.
export function isoDateOffset(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return localIsoDate(date)
}

const MAX_SHARE_EXPIRY_MS = 90 * 86_400_000

/**
 * A custom expiry date ("YYYY-MM-DD") means the link works for the whole of
 * that day, so send the end of the day in the user's time zone. Clamped just
 * inside the server's 90-day cap so picking the last allowed date still works.
 */
export function customExpiryToIso(date: string, now = Date.now()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const endOfDay = new Date(`${date}T23:59:59`)
  if (Number.isNaN(endOfDay.getTime())) return null
  return new Date(Math.min(endOfDay.getTime(), now + MAX_SHARE_EXPIRY_MS - 60_000)).toISOString()
}

/** A share link that has passed its expiry but has not been revoked yet. */
export function isShareLinkExpired(link: Pick<ShareLink, 'expires_at'>, now = Date.now()) {
  return new Date(link.expires_at).getTime() <= now
}

export function shareLabel(link: Pick<ShareLink, 'scope' | 'theme_slug' | 'specialty_key'>) {
  if (link.scope === 'full') return 'Full portfolio (entries only)'
  if (link.scope === 'theme') return `Theme: ${link.theme_slug ? formatCompetencyTheme(link.theme_slug) : 'unknown'}`
  return formatSpecialtyLabel(link.specialty_key)
}

export function exportScopeLabel(value: string) {
  if (value === ALL_RECORDS) return 'all records'
  if (value === UNTAGGED_RECORDS) return 'untagged records'
  return formatSpecialtyLabel(value)
}

export function specialtyChipClass(active: boolean) {
  return `rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
    active
      ? 'border-accent/30 bg-[var(--accent-soft)] text-[var(--accent-soft-text)]'
      : 'border-white/[0.06] bg-white/[0.04] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
  }`
}
