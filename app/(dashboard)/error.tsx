'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Dashboard error:', error.digest ?? error.message)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <p className="text-xs font-mono text-[var(--text-secondary)] tracking-widest mb-6">ERROR</p>
      <h2 className="text-2xl font-medium tracking-tight mb-3">Something went wrong</h2>
      <p className="text-[var(--text-secondary)] text-sm mb-8 max-w-sm leading-relaxed">
        An unexpected error occurred loading this page. Your data is safe.
        {error.digest && <><br /><span className="font-mono text-xs opacity-60">ref: {error.digest}</span></>}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--button-primary-bg-hover)] transition-colors"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="border border-[var(--border-default)] text-[var(--text-secondary)] px-5 py-2.5 rounded-lg text-sm font-medium hover:border-[var(--border-strong)] transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
