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
                ? 'border-[#1B6FD9]/40 bg-[#1B6FD9]/15 text-[#1B6FD9]'
                : 'border-white/[0.08] bg-[#0B0B0C] text-[rgba(245,245,242,0.62)] hover:border-white/[0.15] hover:text-[#F5F5F2]'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
