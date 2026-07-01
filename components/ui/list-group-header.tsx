import type { ReactNode } from 'react'

type Props = {
  // Primary group label, e.g. "Apr 2026".
  label: ReactNode
  // Right-aligned count or context, e.g. "8 cases".
  meta?: ReactNode
  className?: string
}

// Sticky group header used inside dense lists (cases / portfolio grouped by month).
// Uses --bg-sunken (the "table header" surface) rather than --bg-canvas so the
// band reads as distinct from the near-white row surface beneath it — canvas and
// surface are close enough in value that a header painted with canvas blended
// into the rows instead of standing out. The parent list must be the scroll
// container for `sticky` to engage.
export default function ListGroupHeader({ label, meta, className }: Props) {
  return (
    <div
      className={`sticky top-0 z-10 flex items-baseline justify-between gap-2 px-3 py-1.5 bg-[var(--bg-sunken)] backdrop-blur-sm border-b border-subtle text-[11px] uppercase tracking-wide font-medium text-fg-3 ${className ?? ''}`}
    >
      <span>{label}</span>
      {meta ? <span className="text-fg-3 normal-case tracking-normal text-xs">{meta}</span> : null}
    </div>
  )
}
