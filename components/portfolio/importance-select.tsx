'use client'

import { IMPORTANCE_OPTIONS, type Importance } from '@/lib/types/importance'

/** Three-level importance picker (Low / Medium / High). Tapping the active
 *  level again clears it back to "not set" (null). Shared by the portfolio
 *  entry form and the case form. */
export default function ImportanceSelect({
  value,
  onChange,
}: {
  value: Importance | null
  onChange: (value: Importance | null) => void
}) {
  return (
    <div className="flex gap-2" role="group" aria-label="Importance">
      {IMPORTANCE_OPTIONS.map(option => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : option.value)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'border-accent/30 bg-[var(--accent-soft)] text-[var(--accent-soft-text)]'
                : 'border-white/[0.08] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-white/[0.15] hover:text-[var(--text-primary)]'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
