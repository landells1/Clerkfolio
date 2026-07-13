'use client'

import Link from 'next/link'
import { formatCompetencyTheme } from '@/lib/types/portfolio-labels'
import { formatSpecialtyLabel } from '@/lib/specialties'
import type { SubscriptionInfo } from '@/lib/subscription'
import {
  EXPIRY_PRESETS,
  formatDate,
  isoDateOffset,
  shareLabel,
  type ShareLink,
  type ShareScope,
  type TrackedApp,
} from './shared'

// Share links tab: the create-protected-link form and the active-links list.
// All state and the create/copy/renew/revoke handlers live in the page so the
// form survives tab switches.
export function ShareTab({
  subInfo,
  canCreateShareLink,
  hasActiveShareLinks,
  shareScope,
  setShareScope,
  shareSpecialty,
  setShareSpecialty,
  trackedApps,
  shareTheme,
  setShareTheme,
  themes,
  expiryPreset,
  setExpiryPreset,
  customExpiry,
  setCustomExpiry,
  sharePin,
  setSharePin,
  viewWebhookUrl,
  setViewWebhookUrl,
  hideNotes,
  setHideNotes,
  hideReflection,
  setHideReflection,
  redactTags,
  setRedactTags,
  shareLoading,
  onCreate,
  shareLinks,
  copiedToken,
  onCopy,
  onRenew,
  confirmRevoke,
  setConfirmRevoke,
  revokingLink,
  onRevoke,
}: {
  subInfo: SubscriptionInfo | null
  canCreateShareLink: boolean
  hasActiveShareLinks: boolean
  shareScope: ShareScope
  setShareScope: (scope: ShareScope) => void
  shareSpecialty: string
  setShareSpecialty: (specialty: string) => void
  trackedApps: TrackedApp[]
  shareTheme: string
  setShareTheme: (theme: string) => void
  themes: string[]
  expiryPreset: number | null
  setExpiryPreset: (days: number | null) => void
  customExpiry: string
  setCustomExpiry: (date: string) => void
  sharePin: string
  setSharePin: (pin: string) => void
  viewWebhookUrl: string
  setViewWebhookUrl: (url: string) => void
  hideNotes: boolean
  setHideNotes: (hide: boolean) => void
  hideReflection: boolean
  setHideReflection: (hide: boolean) => void
  redactTags: boolean
  setRedactTags: (redact: boolean) => void
  shareLoading: boolean
  onCreate: () => void
  shareLinks: ShareLink[]
  copiedToken: string | null
  onCopy: (token: string) => void
  onRenew: (id: string) => void
  confirmRevoke: string | null
  setConfirmRevoke: (id: string | null) => void
  revokingLink: string | null
  onRevoke: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <section className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Create protected link</h2>
        {subInfo && !subInfo.isPro && (
          <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-[var(--warning)]">
            <p className="font-semibold">
              {canCreateShareLink
                ? '1 of 1 share link available on Free'
                : hasActiveShareLinks
                  ? 'Active link cap reached'
                  : 'Share link cap reached on Free'}
            </p>
            <p className="mt-0.5 text-[var(--text-secondary)]">
              {canCreateShareLink
                ? 'Revoke an existing link to create another, or upgrade for unlimited links.'
                : hasActiveShareLinks
                  ? 'Revoke an existing link or upgrade to Pro for unlimited links.'
                  : 'Free tier includes 1 active share link. Upgrade to Pro for unlimited links.'}
            </p>
            {!canCreateShareLink && (
              <p className="mt-1 text-[var(--text-secondary)]">
                <Link href="/upgrade" className="text-[var(--accent-text)] underline">Upgrade for £9.99/yr</Link> for unlimited share links. Or <Link href="/settings/referrals" className="text-[var(--accent-text)] underline">invite a colleague</Link>. Each successful referral adds one more free share link.
              </p>
            )}
          </div>
        )}
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-emphasis)]">Scope</span>
            <select value={shareScope} onChange={e => setShareScope(e.target.value as ShareScope)} className="w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
              <option value="specialty">Tracked specialty</option>
              <option value="theme">Competency theme</option>
              <option value="full">Full portfolio (entries only)</option>
            </select>
            {shareScope === 'full' && (
              <p className="mt-1.5 text-xs text-[var(--text-muted)]">Shares all your portfolio entries. Cases are never shared.</p>
            )}
          </label>
          {shareScope === 'specialty' && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-emphasis)]">Specialty</span>
              <select value={shareSpecialty} onChange={e => setShareSpecialty(e.target.value)} className="w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
                {trackedApps.length === 0 && <option value="">No tracked specialties</option>}
                {trackedApps.map(app => <option key={app.id} value={app.specialty_key}>{formatSpecialtyLabel(app.specialty_key)}</option>)}
              </select>
              {trackedApps.length === 0 && <p className="mt-1 text-xs text-[var(--warning)]">Track a specialty before creating this type of link.</p>}
            </label>
          )}
          {shareScope === 'theme' && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-emphasis)]">Theme</span>
              <input value={shareTheme} onChange={e => setShareTheme(e.target.value)} list="themes" className="w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm text-[var(--text-primary)]" />
              <datalist id="themes">{themes.map(theme => <option key={theme} value={theme} label={formatCompetencyTheme(theme)} />)}</datalist>
            </label>
          )}
          <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-emphasis)]">Expires</span>
            <div className="grid grid-cols-2 gap-2">
              {EXPIRY_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setExpiryPreset(preset.days)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    expiryPreset === preset.days
                      ? 'border-accent/30 bg-[var(--accent-soft)] text-[var(--accent-soft-text)]'
                      : 'border-white/[0.08] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {expiryPreset === null && (
              <input
                type="date"
                value={customExpiry}
                min={isoDateOffset(1)}
                max={isoDateOffset(90)}
                onChange={e => setCustomExpiry(e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm text-[var(--text-primary)]"
              />
            )}
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-emphasis)]">PIN <span className="text-[var(--danger)]">*</span></span>
            <input value={sharePin} onChange={e => setSharePin(e.target.value)} inputMode="numeric" pattern="[0-9]{4,8}" placeholder="Required PIN (4-8 digits)" className="w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm text-[var(--text-primary)]" />
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Required - anyone opening the link must enter this 4-8 digit PIN.</p>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-emphasis)]">View webhook</span>
            <input
              value={viewWebhookUrl}
              onChange={e => setViewWebhookUrl(e.target.value)}
              placeholder="https://example.com/share-viewed"
              className="w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm text-[var(--text-primary)]"
            />
          </label>
          <div className="space-y-2 rounded-xl border border-white/[0.08] bg-[var(--bg-canvas)] p-3">
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input type="checkbox" checked={hideNotes} onChange={e => setHideNotes(e.target.checked)} />
              Hide notes
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input type="checkbox" checked={hideReflection} onChange={e => setHideReflection(e.target.checked)} />
              Hide reflection text
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input type="checkbox" checked={redactTags} onChange={e => setRedactTags(e.target.checked)} />
              Redact tags
            </label>
          </div>
          <button type="button" onClick={onCreate} disabled={shareLoading || !canCreateShareLink || !/^\d{4,8}$/.test(sharePin.trim()) || (shareScope === 'specialty' && !shareSpecialty)} className="w-full rounded-xl bg-[var(--button-primary-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--button-primary-text)] disabled:opacity-40 disabled:cursor-not-allowed">
            {shareLoading ? 'Creating...' : 'Create link'}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)]">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Active links</h2>
        </div>
        {shareLinks.length === 0 ? (
          <p className="p-6 text-sm text-[var(--text-muted)]">No active share links.</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {shareLinks.map(link => (
              <article key={link.id} className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{shareLabel(link)}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">Expires {formatDate(link.expires_at)} - {link.view_count ?? 0} views</p>
                    {link.view_webhook_url && <p className="mt-1 text-xs text-[var(--success)]">Webhook enabled</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => onCopy(link.token)} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">{copiedToken === link.token ? 'Copied' : 'Copy'}</button>
                    <a href={`/share/${link.token}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Preview</a>
                    <button onClick={() => onRenew(link.id)} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Renew</button>
                    {confirmRevoke === link.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setConfirmRevoke(null)}
                          disabled={revokingLink === link.id}
                          className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-[var(--text-secondary)] disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => onRevoke(link.id)}
                          disabled={revokingLink === link.id}
                          className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-[var(--danger)] disabled:opacity-50"
                        >
                          {revokingLink === link.id ? 'Revoking...' : 'Confirm revoke'}
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmRevoke(link.id)} className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-[var(--danger)]">Revoke</button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
