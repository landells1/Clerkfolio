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
        <Link href="/import" className="text-sm text-[rgba(245,245,242,0.45)] hover:text-[#F5F5F2]">Back</Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#F5F5F2]">JSON backup import</h1>
          <p className="mt-0.5 text-sm text-[rgba(245,245,242,0.45)]">Import raw Clerkfolio JSON or a Clerkfolio ZIP backup.</p>
        </div>
      </div>

      {sub?.limits.canBulkImport ? (
        <JsonImportForm />
      ) : (
        <section className="rounded-2xl border border-[#1B6FD9]/25 bg-[#141416] p-6">
          <h2 className="text-lg font-semibold text-[#F5F5F2]">Bulk import is a Pro feature</h2>
          <p className="mt-2 text-sm text-[rgba(245,245,242,0.52)]">Free accounts can still add cases and portfolio entries manually.</p>
          <Link href="/upgrade" className="mt-5 inline-flex min-h-[44px] items-center rounded-xl bg-[#1B6FD9] px-5 text-sm font-semibold text-[#0B0B0C]">
            Upgrade to Pro
          </Link>
        </section>
      )}
    </div>
  )
}
