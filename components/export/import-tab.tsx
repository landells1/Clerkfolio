'use client'

import Link from 'next/link'
import type { SubscriptionInfo } from '@/lib/subscription'

// Import tab: launcher cards linking to the Horus / CSV / JSON import flows.
export function ImportTab({ subInfo }: { subInfo: SubscriptionInfo | null }) {
  return (
    <section className="space-y-4">
      {subInfo && !subInfo.isPro && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs">
          <p className="font-semibold text-[var(--warning)]">Bulk import is a Pro feature</p>
          <p className="mt-1 text-[var(--text-secondary)]">
            Importing from Horus, a spreadsheet, or a backup is available on Pro. You can still add entries manually on Free.
            {' '}<Link href="/upgrade" className="text-[var(--accent-text)] underline">Upgrade for £9.99/yr</Link>.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/import" className="rounded-2xl border border-accent/12 bg-[var(--bg-surface)] p-5 transition-colors hover:border-accent/30 sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Import from Horus</h2>
            <span className="rounded-full border border-accent/30 bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent-soft-text)]">Recommended</span>
          </div>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">Bring your NHS foundation e-portfolio (supervised learning events, reflections) straight in from a Horus CSV export. Other foundation portfolio exports with date / type / title columns work too.</p>
        </Link>
        <Link href="/import/csv" className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5 transition-colors hover:border-white/[0.16]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">CSV / spreadsheet</h2>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">Map columns from any CSV (MicroGuide, NHS Learn, or your own) to portfolio entries or cases.</p>
        </Link>
        <Link href="/import/json" className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5 transition-colors hover:border-white/[0.16]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Clerkfolio backup</h2>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">Restore from a Clerkfolio JSON backup - the file you download from the Data backup tab.</p>
        </Link>
      </div>
    </section>
  )
}
