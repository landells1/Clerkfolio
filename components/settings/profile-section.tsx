'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { ProfileState } from './profile-state'

export type EmailChangeForm = { open: boolean; newEmail: string; password: string }

function profileDisplayName(profile: Pick<ProfileState, 'first_name' | 'last_name'>) {
  return [profile.first_name, profile.last_name].filter(Boolean).join(' ')
}

function isLoyalAccount(createdAt: string) {
  if (!createdAt) return false
  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) return false
  return Date.now() - created >= 365 * 24 * 60 * 60 * 1000
}

// Name/timezone profile form plus the reauth-gated email-change panel.
export function ProfileSection({
  profile,
  setProfile,
  accountCreatedAt,
  email,
  emailForm,
  setEmailForm,
  emailChangeLoading,
  emailChangeSentTo,
  setEmailChangeSentTo,
  onEmailChange,
  savingProfile,
  onSubmit,
}: {
  profile: ProfileState
  setProfile: Dispatch<SetStateAction<ProfileState>>
  accountCreatedAt: string
  email: string
  emailForm: EmailChangeForm
  setEmailForm: Dispatch<SetStateAction<EmailChangeForm>>
  emailChangeLoading: boolean
  emailChangeSentTo: string | null
  setEmailChangeSentTo: (email: string | null) => void
  onEmailChange: (e: React.SyntheticEvent) => void
  savingProfile: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <section className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-6 mb-6">
      <div className="mb-5 flex items-center gap-2">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{profileDisplayName(profile) || 'Profile'}</h2>
        {isLoyalAccount(accountCreatedAt) && (
          <span title="One year on Clerkfolio" aria-label="One year on Clerkfolio" className="text-sm">
            🎓
          </span>
        )}
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-xs font-medium text-[var(--text-emphasis)] uppercase tracking-wide">
            First name
            <input
              value={profile.first_name}
              onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))}
              className="mt-1.5 w-full min-h-[44px] bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] normal-case tracking-normal"
            />
          </label>
          <label className="text-xs font-medium text-[var(--text-emphasis)] uppercase tracking-wide">
            Last name
            <input
              value={profile.last_name}
              onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))}
              className="mt-1.5 w-full min-h-[44px] bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] normal-case tracking-normal"
            />
          </label>
        </div>
        <div className="text-xs font-medium text-[var(--text-emphasis)] uppercase tracking-wide">
          Email
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input value={email} disabled className="w-full min-h-[44px] flex-1 bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-muted)] normal-case tracking-normal" />
            {!emailForm.open && (
              <button
                type="button"
                onClick={() => { setEmailChangeSentTo(null); setEmailForm({ open: true, newEmail: '', password: '' }) }}
                className="min-h-[44px] shrink-0 rounded-lg border border-white/[0.12] px-4 py-2.5 text-sm font-medium normal-case tracking-normal text-[var(--text-primary)] hover:bg-white/[0.06]"
              >
                Change email
              </button>
            )}
          </div>
          {emailChangeSentTo && !emailForm.open && (
            <p role="status" className="mt-2 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-xs font-normal normal-case tracking-normal text-[var(--accent-soft-text)]">
              We sent a confirmation link to {emailChangeSentTo}. Open it to finish changing your login email. Your current email stays active until you do.
            </p>
          )}
          {emailForm.open && (
            <div className="mt-2 rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] p-3">
              <p className="text-xs font-normal normal-case tracking-normal text-[var(--text-secondary)]">
                We&apos;ll email a confirmation link to the new address. Your login email changes only after you open it. A verified institutional email is re-checked when your login email changes.
              </p>
              <input
                type="email"
                autoComplete="email"
                value={emailForm.newEmail}
                onChange={e => setEmailForm(f => ({ ...f, newEmail: e.target.value }))}
                placeholder="new@email.com"
                className="mt-2 w-full min-h-[44px] rounded-lg border border-white/[0.08] bg-[var(--bg-surface)] px-3.5 py-2.5 text-sm normal-case tracking-normal text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
              <input
                type="password"
                autoComplete="current-password"
                value={emailForm.password}
                onChange={e => setEmailForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Current password"
                className="mt-2 w-full min-h-[44px] rounded-lg border border-white/[0.08] bg-[var(--bg-surface)] px-3.5 py-2.5 text-sm normal-case tracking-normal text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onEmailChange}
                  disabled={emailChangeLoading}
                  className="min-h-[44px] rounded-lg bg-[var(--button-primary-bg)] px-4 py-2.5 text-sm font-semibold normal-case tracking-normal text-[var(--button-primary-text)] hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-50"
                >
                  {emailChangeLoading ? 'Sending...' : 'Send confirmation'}
                </button>
                <button
                  type="button"
                  onClick={() => setEmailForm({ open: false, newEmail: '', password: '' })}
                  disabled={emailChangeLoading}
                  className="min-h-[44px] rounded-lg border border-white/[0.08] px-4 py-2.5 text-sm font-medium normal-case tracking-normal text-[var(--text-secondary)] disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        <label className="block text-xs font-medium text-[var(--text-emphasis)] uppercase tracking-wide">
          Timezone
          <select value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))} className="mt-1.5 w-full min-h-[44px] bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] normal-case tracking-normal">
            <option value="Europe/London">Europe/London</option>
            <option value="UTC">UTC</option>
            <option value="Europe/Dublin">Europe/Dublin</option>
            <option value="Europe/Paris">Europe/Paris</option>
          </select>
          <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-[var(--text-muted)]">
            Used to display deadlines and digest send times in your local time.
          </span>
        </label>
        <button disabled={savingProfile} className="min-h-[44px] bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-50 text-[var(--button-primary-text)] font-semibold rounded-lg px-5 py-2.5 text-sm">
          {savingProfile ? 'Saving...' : 'Save profile'}
        </button>
      </form>
    </section>
  )
}
