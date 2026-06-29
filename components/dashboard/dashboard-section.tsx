'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'clerkfolio-dashboard-sections'

function readState(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, boolean>
  } catch {
    return {}
  }
}

function writeState(state: Record<string, boolean>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage can throw in private browsing or when full; ignore.
  }
}

type Props = {
  title: string
  subtitle?: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export default function DashboardSection({ title, subtitle, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const state = readState()
    if (Object.prototype.hasOwnProperty.call(state, title)) {
      setOpen(state[title])
    }
    setHydrated(true)
  }, [title])

  return (
    <details className="group" open={open}>
      <summary
        aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`}
        className="flex min-h-[44px] cursor-pointer list-none items-center justify-between rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] px-4 py-3 text-sm font-semibold text-[var(--text-primary)]"
        onClick={e => {
          e.preventDefault()
          const next = !open
          setOpen(next)
          if (hydrated) {
            const state = readState()
            state[title] = next
            writeState(state)
          }
        }}
      >
        <span>
          {title}
          {subtitle && (
            <span className="ml-2 font-normal text-xs text-[var(--text-muted)]">{subtitle}</span>
          )}
        </span>
        <span className="text-[var(--text-secondary)] group-open:rotate-90 transition-transform">&gt;</span>
      </summary>
      <div className="pt-4">{children}</div>
    </details>
  )
}
