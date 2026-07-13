import type { ReactNode } from 'react'

export function WindowChrome({
  url,
  label,
  children,
  className = '',
  contentClassName = '',
}: {
  url: string
  label: string
  children: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`overflow-hidden rounded-xl border border-default bg-[var(--bg-surface)] shadow-[0_30px_80px_rgba(0,0,0,0.32)] ${className}`}
    >
      <div aria-hidden="true">
        <div className="flex items-center gap-2 border-b border-default px-3.5 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]/80" />
          </div>
          <div className="min-w-0 flex-1 truncate rounded bg-[var(--bg-canvas)] px-2 py-1 text-center font-mono text-[11px] text-ink-dim">
            {url}
          </div>
        </div>
        <div className={contentClassName}>{children}</div>
      </div>
    </div>
  )
}
