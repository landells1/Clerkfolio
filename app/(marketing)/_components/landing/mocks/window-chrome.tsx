import type { ReactNode } from 'react'

export function WindowChrome({
  url,
  children,
  className = '',
  contentClassName = '',
}: {
  url: string
  children: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <div className={`overflow-hidden rounded-xl border border-white/[0.08] bg-[#141416] shadow-[0_30px_80px_rgba(0,0,0,0.55)] ${className}`}>
      <div className="flex items-center gap-2 border-b border-white/[0.08] px-3.5 py-2.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]/80" />
        </div>
        <div className="flex-1 rounded bg-[#0B0B0C] px-2 py-1 text-center font-mono text-[11px] text-ink-dim">
          {url}
        </div>
      </div>
      <div className={contentClassName}>{children}</div>
    </div>
  )
}
