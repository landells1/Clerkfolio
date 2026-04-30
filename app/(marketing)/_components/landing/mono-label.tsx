import type { ReactNode } from 'react'

export function MonoLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`font-mono text-[11px] uppercase tracking-[0.14em] text-ink-dim ${className}`}>
      {children}
    </span>
  )
}
