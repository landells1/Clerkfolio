'use client'

import type { Theme } from '@/lib/theme'

// Cream/dark theme picker. Applying and persisting the choice is handled by
// the page's chooseTheme.
export function AppearanceSection({
  theme,
  onChooseTheme,
}: {
  theme: Theme | undefined
  onChooseTheme: (theme: Theme) => void
}) {
  return (
    <section className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-6 mb-6">
      <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">Appearance</h2>
      <p className="text-sm text-[var(--text-secondary)] mb-4">Choose your colour scheme. Applies instantly and follows you across devices.</p>
      <div className="grid grid-cols-2 gap-3 max-w-md" role="radiogroup" aria-label="Colour theme">
        {([
          { value: 'cream' as Theme, label: 'Cream', hint: 'Warm light (default)', canvas: '#EDE8D0', surface: '#F5F1E1', ink: '#26241E' },
          { value: 'dark' as Theme, label: 'Dark', hint: 'Original scheme', canvas: '#0B0B0C', surface: '#141416', ink: '#F5F5F2' },
        ]).map(opt => {
          const active = (theme ?? 'cream') === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChooseTheme(opt.value)}
              className={`rounded-xl border p-3 text-left transition-colors ${active ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/40' : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'}`}
            >
              <div className="rounded-lg border border-[var(--border-default)] overflow-hidden mb-3" style={{ background: opt.canvas }}>
                <div className="h-10 flex items-end p-1.5 gap-1">
                  <span className="h-5 w-8 rounded" style={{ background: opt.surface, border: '1px solid rgba(128,128,128,0.25)' }} />
                  <span className="h-2 w-10 rounded self-center" style={{ background: opt.ink, opacity: 0.85 }} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text-primary)]">{opt.label}</span>
                {active && <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-text)]">Active</span>}
              </div>
              <span className="text-xs text-[var(--text-muted)]">{opt.hint}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
