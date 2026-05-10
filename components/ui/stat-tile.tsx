import type { ReactNode } from 'react'
import type { PillColour } from '@/lib/specialties/colours'

type Props = {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon?: ReactNode
  // Progress bar at the bottom (0-100). Hidden when undefined.
  barPct?: number
  // Colour for both the bar and (subtly) the icon background.
  barColour?: PillColour
  // Optional click handler turns the tile into an interactive button.
  onClick?: () => void
  className?: string
}

const BAR_BG: Record<PillColour, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
  cyan: 'bg-cyan-500',
  pink: 'bg-pink-500',
  red: 'bg-red-500',
  teal: 'bg-teal-500',
  indigo: 'bg-indigo-500',
  fuchsia: 'bg-fuchsia-500',
  neutral: 'bg-fg-2',
}

// The four-up tile shown at the top of Dashboard, Cases, Portfolio, Logs.
// Keeps to the surface-1/surface-2 layering: card sits on surface-0 page.
export default function StatTile({
  label,
  value,
  sub,
  icon,
  barPct,
  barColour = 'blue',
  onClick,
  className,
}: Props) {
  const Element = onClick ? 'button' : 'div'
  const interactive = onClick
    ? 'text-left hover:border-default hover:bg-surface-2 transition-colors'
    : ''
  const pct = typeof barPct === 'number'
    ? Math.max(0, Math.min(100, barPct))
    : null
  return (
    <Element
      onClick={onClick}
      className={`relative overflow-hidden rounded-lg border border-subtle bg-surface-1 p-4 ${interactive} ${className ?? ''}`}
    >
      {icon ? (
        <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded text-fg-1">
          {icon}
        </div>
      ) : null}
      <div className="text-[11px] uppercase tracking-wide text-fg-3 font-medium">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-fg leading-none">{value}</div>
      {sub ? <div className="mt-1.5 text-xs text-fg-2">{sub}</div> : null}
      {pct !== null ? (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface-3">
          <div
            className={`h-full ${BAR_BG[barColour]} transition-[width] duration-300`}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
    </Element>
  )
}
