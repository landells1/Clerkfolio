import type { ReactNode } from 'react'

export function DomainPill({ children }: { children: ReactNode }) {
  return <span className="rounded border border-cyan-500/20 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-medium text-cyan-400">{children}</span>
}

export function SpecialtyPill({ children }: { children: ReactNode }) {
  return <span className="rounded border border-accent/30 bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent-soft-text)]">{children}</span>
}

export function StatusDot({ status }: { status: 'green' | 'amber' }) {
  return <span className={`h-1.5 w-1.5 rounded-full ${status === 'green' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
}
