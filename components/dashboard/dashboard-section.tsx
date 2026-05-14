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

  function toggle(e: React.SyntheticEvent<HTMLDetailsElement>) {
    const next = (e.currentTarget as HTMLDetailsElement).open
    setOpen(next)
    if (hydrated) {
      const state = readState()
      state[title] = next
      writeState(state)
    }
  }

  return (
    <details className="group" open={open} onToggle={toggle}>
      <summary
        aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`}
        className="flex min-h-[44px] cursor-pointer list-none items-center justify-between rounded-xl bg-[#141416] border border-white/[0.08] px-4 py-3 text-sm font-semibold text-[#F5F5F2]"
      >
        <span>
          {title}
          {subtitle && (
            <span className="ml-2 font-normal text-xs text-[rgba(245,245,242,0.45)]">{subtitle}</span>
          )}
        </span>
        <span className="text-[rgba(245,245,242,0.55)] group-open:rotate-90 transition-transform">&gt;</span>
      </summary>
      <div className="pt-4">{children}</div>
    </details>
  )
}
