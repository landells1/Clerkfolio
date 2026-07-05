'use client'

import type { ProfileState } from './profile-state'

export function AccessibilitySection({
  displayPrefs,
  onSetDisplayPref,
  savingProfile,
  onSave,
}: {
  displayPrefs: ProfileState['display_prefs']
  onSetDisplayPref: (key: 'high_contrast' | 'dyslexic_font', value: boolean) => void
  savingProfile: boolean
  onSave: () => void
}) {
  return (
    <section className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-6 mb-6">
      <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">Accessibility</h2>
      <div className="space-y-3">
        <label className="flex items-center justify-between gap-4 text-sm text-[var(--text-secondary)]">
          High contrast
          <input
            type="checkbox"
            checked={Boolean(displayPrefs.high_contrast)}
            onChange={e => onSetDisplayPref('high_contrast', e.target.checked)}
          />
        </label>
        <label className="flex items-center justify-between gap-4 text-sm text-[var(--text-secondary)]">
          Dyslexic-friendly font
          <input
            type="checkbox"
            checked={Boolean(displayPrefs.dyslexic_font)}
            onChange={e => onSetDisplayPref('dyslexic_font', e.target.checked)}
          />
        </label>
      </div>
      <button onClick={() => onSave()} disabled={savingProfile} className="mt-5 min-h-[44px] rounded-lg bg-[var(--button-primary-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--button-primary-text)] disabled:opacity-50">
        Save display preferences
      </button>
    </section>
  )
}
