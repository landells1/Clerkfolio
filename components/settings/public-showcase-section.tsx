'use client'

import type { Dispatch, SetStateAction } from 'react'
import Link from 'next/link'
import type { ProfileState } from './profile-state'

export function normalisePublicSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63)
}

export function PublicShowcaseSection({
  profile,
  setProfile,
  origin,
  savingProfile,
  onSave,
}: {
  profile: ProfileState
  setProfile: Dispatch<SetStateAction<ProfileState>>
  origin: string
  savingProfile: boolean
  onSave: () => void
}) {
  return (
    <section className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-6 mb-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Public showcase</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {profile.public_slug ? `${origin || ''}/showcase/${normalisePublicSlug(profile.public_slug)}` : 'Choose a public slug'}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={profile.public_showcase_enabled}
            onChange={e => setProfile(p => ({ ...p, public_showcase_enabled: e.target.checked }))}
          />
          Enabled
        </label>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={profile.public_slug}
          onChange={e => setProfile(p => ({ ...p, public_slug: e.target.value }))}
          placeholder="dr-test"
          className="min-h-[44px] flex-1 rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
        <button onClick={() => onSave()} disabled={savingProfile} className="min-h-[44px] rounded-lg bg-[var(--button-primary-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--button-primary-text)] disabled:opacity-50">
          Save showcase
        </button>
      </div>
      {profile.public_slug && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-[var(--text-secondary)]">
            Public showcases display entry titles, categories, dates, and linked specialty labels. Private notes and reflection text are not shown.
          </p>
          <Link href={`/showcase/${normalisePublicSlug(profile.public_slug)}`} className="inline-flex text-sm text-[var(--accent-text)] hover:text-[var(--accent-text)]">
            Preview showcase
          </Link>
        </div>
      )}
    </section>
  )
}
