import type { ReactNode } from 'react'

type Props = {
  title: ReactNode
  sub?: ReactNode
  // Right-aligned actions. Spec rule: at most one filled primary button per page header.
  actions?: ReactNode
  className?: string
}

// Replaces the previous page-level header. Single-line title, optional one-line subtitle,
// actions cluster on the right. Use this on every redesigned page.
export default function SectionHeader({ title, sub, actions, className }: Props) {
  return (
    <header className={`flex flex-wrap items-end justify-between gap-3 mb-5 ${className ?? ''}`}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-fg leading-tight tracking-tight">{title}</h1>
        {sub ? <p className="mt-0.5 text-sm text-fg-2 truncate">{sub}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  )
}
