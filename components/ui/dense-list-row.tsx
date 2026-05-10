'use client'

import Link from 'next/link'
import type { ReactNode, MouseEventHandler } from 'react'

type Props = {
  // Leading icon (typically in a specialty colour).
  icon?: ReactNode
  title: ReactNode
  // Trailing tags / pills (specialty, status). Aligned right of the title at md+.
  tags?: ReactNode
  // Right-aligned date / metadata.
  meta?: ReactNode
  // Secondary line; hidden by default, shown on hover (group-hover) and when expanded.
  secondary?: ReactNode
  // If provided, the whole row becomes a link (use this for case / portfolio detail nav).
  href?: string
  onClick?: MouseEventHandler
  className?: string
}

// Tighter row styling for high-volume lists (Cases at 200+, Portfolio).
// Hover reveals secondary detail without the user having to click in.
export default function DenseListRow({
  icon, title, tags, meta, secondary, href, onClick, className,
}: Props) {
  const inner = (
    <div className={`group flex items-center gap-3 px-3 py-2 hover:bg-surface-3 border-b border-subtle last:border-b-0 transition-colors ${className ?? ''}`}>
      {icon ? <div className="shrink-0 text-fg-1">{icon}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-fg truncate min-w-0">{title}</span>
          {tags ? <span className="flex items-center gap-1.5 flex-wrap">{tags}</span> : null}
        </div>
        {secondary ? (
          <div className="mt-1 text-xs text-fg-2 line-clamp-1 hidden group-hover:block">
            {secondary}
          </div>
        ) : null}
      </div>
      {meta ? <div className="shrink-0 text-xs text-fg-3 tabular-nums">{meta}</div> : null}
      <svg className="shrink-0 w-3.5 h-3.5 text-fg-3 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  )
  if (href) {
    return <Link href={href} className="block">{inner}</Link>
  }
  if (onClick) {
    return <button type="button" onClick={onClick} className="block w-full text-left">{inner}</button>
  }
  return inner
}
