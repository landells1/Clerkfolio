import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CaseCard from '@/components/cases/case-card'

export default async function CasesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: cases } = await supabase
    .from('cases')
    .select('*')
    .eq('user_id', user!.id)
    .order('date', { ascending: false })

  const total = cases?.length ?? 0

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Cases</h1>
          <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">
            {total} {total === 1 ? 'case' : 'cases'} logged
          </p>
        </div>
        <Link
          href="/cases/new"
          className="flex items-center gap-2 bg-[#1D9E75] hover:bg-[#178060] text-[#0B0B0C] font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Log case
        </Link>
      </div>

      {/* Anonymisation notice */}
      <div className="flex items-start gap-3 bg-[#141416] border border-white/[0.06] rounded-xl px-4 py-3 mb-6">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-xs text-[rgba(245,245,242,0.4)] leading-relaxed">
          All case entries must be anonymised. Do not include patient names, dates of birth, NHS numbers, or other identifying information.
        </p>
      </div>

      {/* Case list */}
      {!cases || cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12h6m-3-3v6M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" />
            </svg>
          </div>
          <p className="text-sm text-[rgba(245,245,242,0.5)] mb-1">No cases logged yet</p>
          <p className="text-xs text-[rgba(245,245,242,0.3)] mb-6 max-w-xs">
            Start logging clinical cases you&apos;ve seen. They&apos;ll appear here and on your dashboard.
          </p>
          <Link
            href="/cases/new"
            className="flex items-center gap-2 bg-[#1D9E75] hover:bg-[#178060] text-[#0B0B0C] font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Log your first case
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {cases.map(c => (
            <CaseCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  )
}
