import Link from 'next/link'
import HorusImportWizard from '@/components/import/horus-import-wizard'
import { createClient } from '@/lib/supabase/server'
import { fetchSubscriptionInfo } from '@/lib/subscription'
import { formatSpecialtyLabel } from '@/lib/specialties'

export default async function ImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [sub, { data: specialties }] = user
    ? await Promise.all([
        fetchSubscriptionInfo(supabase, user.id),
        supabase
          .from('specialty_applications')
          .select('specialty_key')
          .eq('user_id', user.id)
          .eq('is_active', true),
      ])
    : [null, { data: [] }]

  const specialtyOptions = (specialties ?? []).map(row => ({
    key: row.specialty_key,
    name: formatSpecialtyLabel(row.specialty_key),
  }))

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Import your portfolio</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Bring an existing portfolio into Clerkfolio. The Horus importer is below — you can also map a CSV/spreadsheet or restore a Clerkfolio backup.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/import/csv" className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">CSV / spreadsheet</Link>
            <Link href="/import/json" className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Clerkfolio backup</Link>
          </div>
        </div>
      </div>

      {sub?.limits.canBulkImport ? (
        <HorusImportWizard specialtyOptions={specialtyOptions} />
      ) : (
        <section className="rounded-2xl border border-accent/12 bg-[var(--bg-surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Bulk import is a Pro feature</h2>
          <p className="mt-2 max-w-2xl mx-auto text-sm leading-relaxed text-[var(--text-secondary)]">
            CSV and Horus imports are available on Pro. Free accounts can still add cases and portfolio entries manually.
          </p>
          <Link
            href="/upgrade"
            className="mt-5 inline-flex min-h-[44px] items-center rounded-xl bg-[var(--button-primary-bg)] px-5 text-sm font-semibold text-[var(--button-primary-text)] hover:bg-[var(--button-primary-bg-hover)]"
          >
            Upgrade to Pro
          </Link>
        </section>
      )}
    </div>
  )
}
