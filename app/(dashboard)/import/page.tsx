import Link from 'next/link'
import HorusImportWizard from '@/components/import/horus-import-wizard'
import { createClient } from '@/lib/supabase/server'
import { fetchSubscriptionInfo } from '@/lib/subscription'

export default async function ImportPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const sub = user ? await fetchSubscriptionInfo(supabase, user.id) : null

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Import from Horus</h1>
          <p className="text-sm text-[rgba(245,245,242,0.45)] mt-0.5">
            Import supervised learning events from your NHS Horus e-portfolio
          </p>
        </div>
      </div>

      {sub?.limits.canBulkImport ? (
        <HorusImportWizard />
      ) : (
        <section className="rounded-2xl border border-[#1B6FD9]/25 bg-[#141416] p-6">
          <h2 className="text-lg font-semibold text-[#F5F5F2]">Bulk import is a Pro feature</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[rgba(245,245,242,0.52)]">
            CSV and Horus imports are available on Pro. Free accounts can still add cases and portfolio entries manually.
          </p>
          <Link
            href="/settings"
            className="mt-5 inline-flex min-h-[44px] items-center rounded-xl bg-[#1B6FD9] px-5 text-sm font-semibold text-[#0B0B0C] hover:bg-[#155BB0]"
          >
            Upgrade to Pro
          </Link>
        </section>
      )}
    </div>
  )
}
