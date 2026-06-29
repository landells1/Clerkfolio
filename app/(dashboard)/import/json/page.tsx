import Link from 'next/link'
import JsonImportForm from '@/components/import/json-import-form'
import { createClient } from '@/lib/supabase/server'
import { fetchSubscriptionInfo } from '@/lib/subscription'

export default async function JsonImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const sub = user ? await fetchSubscriptionInfo(supabase, user.id) : null

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/import" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">Back</Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">JSON backup import</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">Import raw Clerkfolio JSON or a Clerkfolio ZIP backup.</p>
        </div>
      </div>

      {sub?.limits.canBulkImport ? (
        <JsonImportForm />
      ) : (
        <section className="rounded-2xl border border-[#1B6FD9]/25 bg-[var(--bg-surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Bulk import is a Pro feature</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Free accounts can still add cases and portfolio entries manually.</p>
          <Link href="/upgrade" className="mt-5 inline-flex min-h-[44px] items-center rounded-xl bg-[var(--accent)] px-5 text-sm font-semibold text-white">
            Upgrade to Pro
          </Link>
        </section>
      )}
    </div>
  )
}
