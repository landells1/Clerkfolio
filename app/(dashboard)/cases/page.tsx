import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CasesListClient from '@/components/cases/cases-list-client'
import DraftResumeBanner from '@/components/cases/draft-resume-banner'
import type { Case } from '@/lib/types/cases'

export default async function CasesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: cases }, { data: allCasesMeta }, { data: trackedSpecialtyRows }] = await Promise.all([
    supabase
      .from('cases')
      .select('*')
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('cases')
      .select('clinical_domain, clinical_domains, specialty_tags')
      .eq('user_id', user!.id)
      .is('deleted_at', null),
    supabase
      .from('specialty_applications')
      .select('specialty_key')
      .eq('user_id', user!.id),
  ])

  const domainCountMap: Record<string, number> = {}
  allCasesMeta?.forEach(c => {
    const domains: string[] = (c as { clinical_domains?: string[] }).clinical_domains?.length
      ? (c as { clinical_domains: string[] }).clinical_domains
      : c.clinical_domain ? [c.clinical_domain] : []
    domains.forEach(domain => { domainCountMap[domain] = (domainCountMap[domain] ?? 0) + 1 })
  })

  const trackedSpecialtyKeys = (trackedSpecialtyRows ?? []).map(row => row.specialty_key)
  const total = allCasesMeta?.length ?? 0

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Cases</h1>
          <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">{total} {total === 1 ? 'case' : 'cases'} logged</p>
        </div>
        <Link href="/cases/new" className="min-h-[44px] flex items-center gap-2 bg-[#1B6FD9] hover:bg-[#155BB0] text-[#0B0B0C] font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors">
          <span className="text-lg leading-none">+</span>
          Log case
        </Link>
      </div>

      {Object.keys(domainCountMap).length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-6 text-xs text-[rgba(245,245,242,0.4)]">
          {Object.entries(domainCountMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6)
            .map(([domain, count]) => (
              <span key={domain}><span className="text-[rgba(245,245,242,0.65)]">{count}</span> {domain}</span>
            ))}
        </div>
      )}

      <DraftResumeBanner />

      <div className="flex items-start gap-3 bg-[#141416] border border-white/[0.06] rounded-xl px-4 py-3 mb-6">
        <p className="text-xs text-[rgba(245,245,242,0.4)] leading-relaxed">
          All case entries must be anonymised. Do not include patient names, dates of birth, NHS numbers, or other identifying information.
        </p>
      </div>

      {!cases || cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-[rgba(245,245,242,0.5)] mb-1">No cases logged yet</p>
          <p className="text-xs text-[rgba(245,245,242,0.3)] mb-6 max-w-xs">Start logging anonymised clinical cases. They will appear here as a journal timeline.</p>
          <Link href="/cases/new" className="min-h-[44px] flex items-center gap-2 bg-[#1B6FD9] hover:bg-[#155BB0] text-[#0B0B0C] font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors">
            Log your first case
          </Link>
        </div>
      ) : (
        <CasesListClient cases={cases as Case[]} userInterests={trackedSpecialtyKeys} />
      )}
    </div>
  )
}
