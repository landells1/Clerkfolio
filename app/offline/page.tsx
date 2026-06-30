import Link from 'next/link'

export const metadata = {
  title: 'Offline - Clerkfolio',
  robots: { index: false, follow: false },
}

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] px-4 text-[var(--text-primary)]">
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-[var(--warning)]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>
        <h1 className="mb-2 text-lg font-semibold">You are offline</h1>
        <p className="mb-6 text-sm text-[var(--text-secondary)]">
          Clerkfolio cannot reach the server right now. Cached pages of the dashboard, portfolio and cases are still available; new entries cannot save until your connection returns.
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded-lg bg-[var(--button-primary-bg)] px-4 py-2 text-sm font-semibold text-[var(--button-primary-text)] transition-colors hover:bg-[var(--button-primary-bg-hover)]"
        >
          Try the dashboard
        </Link>
      </div>
    </div>
  )
}
