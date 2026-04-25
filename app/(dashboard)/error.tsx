'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Dashboard error:', error.digest ?? error.message)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <p className="text-xs font-mono text-[rgba(245,245,242,0.3)] tracking-widest mb-6">§ ERROR</p>
      <h2 className="text-2xl font-medium tracking-tight mb-3">Something went wrong</h2>
      <p className="text-[rgba(245,245,242,0.5)] text-sm mb-8 max-w-sm leading-relaxed">
        An unexpected error occurred loading this page. Your data is safe.
        {error.digest && <><br /><span className="font-mono text-xs opacity-60">ref: {error.digest}</span></>}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="bg-[#1B6FD9] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#1B6FD9]/90 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="border border-[rgba(245,245,242,0.12)] text-[rgba(245,245,242,0.7)] px-5 py-2.5 rounded-lg text-sm font-medium hover:border-[rgba(245,245,242,0.25)] transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
