import type { ReactNode } from 'react'

type Props = {
  // Primary group label, e.g. "Apr 2026".
  label: ReactNode
  // Right-aligned count or context, e.g. "8 cases".
  meta?: ReactNode
  className?: string
}

// Sticky group header used inside dense lists (cases / portfolio grouped by month).
// Sits flush with surface-0 (the page bg) so the rows below it appear to scroll
// underneath. The parent list must be the scroll container for `sticky` to engage.
export default function ListGroupHeader({ label, meta, className }: Props) {
  return (
    <div
      className={`sticky top-0 z-10 flex items-baseline justify-between gap-2 px-3 py-1.5 bg-surface-0/95 backdrop-blur-sm border-b border-subtle text-[11px] uppercase tracking-wide font-medium text-fg-3 ${className ?? ''}`}
    >
      <span>{label}</span>
      {meta ? <span className="text-fg-3 normal-case tracking-normal text-xs">{meta}</span> : null}
    </div>
  )
}
