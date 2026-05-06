import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CasesListClient from '@/components/cases/cases-list-client'
import DraftResumeBanner from '@/components/cases/draft-resume-banner'
import type { Case } from '@/lib/types/cases'
import SavedSearchBar from '@/components/search/saved-search-bar'
import { matchesParsedQuery, parseSearchQuery } from '@/lib/search/parser'
import { completenessScore, missingCompletenessFields } from '@/lib/utils/completeness'

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; complete?: string; min_score?: string; max_score?: string; missing?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const q = resolvedSearchParams.q ?? ''
  const completeOnly = resolvedSearchParams.complete === '1'
  const minScore = resolvedSearchParams.min_score ? Number(resolvedSearchParams.min_score) : undefined
  const maxScore = resolvedSearchParams.max_score ? Number(resolvedSearchParams.max_score) : undefined
  const hasMinScore = minScore !== undefined && Number.isFinite(minScore)
  const hasMaxScore = maxScore !== undefined && Number.isFinite(maxScore)
  const missing = resolvedSearchParams.missing ?? ''

  const [{ data: cases }, { data: allCasesMeta }, { data: trackedSpecialtyRows }, { data: evidenceFiles }] = await Promise.all([
    supabase
      .from('cases')
      .select('id, user_id, title, date, clinical_domain, clinical_domains, specialty_tags, notes, pinned, completeness_score, deleted_at, created_at, updated_at, interview_themes')
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
    supabase
      .from('evidence_files')
      .select('entry_id, file_name')
      .eq('user_id', user!.id)
      .eq('entry_type', 'case'),
  ])
  const fileNamesByCase = new Map<string, string[]>()
  ;(evidenceFiles ?? []).forEach(file => {
    fileNamesByCase.set(file.entry_id, [...(fileNamesByCase.get(file.entry_id) ?? []), file.file_name])
  })
  const parsedQuery = parseSearchQuery(q)
  parsedQuery.completeness = {
    ...(parsedQuery.completeness ?? {}),
    ...(completeOnly ? { exact: 2 } : {}),
    ...(hasMinScore ? { min: minScore } : {}),
    ...(hasMaxScore ? { max: maxScore } : {}),
  }
  if (missing) parsedQuery.missing = missing.toLowerCase()
  const filteredCases = ((cases ?? []) as Case[]).filter(c => {
    const scoredCase = (c as Case & { completeness_score?: number | null }).completeness_score ?? completenessScore(c, 'case')
    return matchesParsedQuery(
      { ...c, file_names: fileNamesByCase.get(c.id) ?? [] },
      parsedQuery,
      { completenessScore: scoredCase, missingFields: missingCompletenessFields(c, 'case') },
    )
  })

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

      <form className="mb-3 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search cases" className="min-h-[44px] flex-1 rounded-xl border border-white/[0.08] bg-[#141416] px-4 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.55)] outline-none focus:border-[#1B6FD9]" />
        <label className="flex min-h-[44px] items-center gap-2 rounded-xl border border-white/[0.08] bg-[#141416] px-3 text-xs text-[rgba(245,245,242,0.65)]">
          <input type="checkbox" name="complete" value="1" defaultChecked={completeOnly} />
          Green only
        </label>
        <select name="missing" defaultValue={missing} className="min-h-[44px] rounded-xl border border-white/[0.08] bg-[#141416] px-3 text-sm text-[#F5F5F2]">
          <option value="">Any fields</option>
          <option value="notes">Missing notes</option>
          <option value="clinical domain">Missing domain</option>
          <option value="date">Missing date</option>
        </select>
        <label className="flex min-h-[44px] items-center gap-2 rounded-xl border border-white/[0.08] bg-[#141416] px-3 text-xs text-[rgba(245,245,242,0.65)]">
          Min
          <input type="range" name="min_score" min="0" max="2" defaultValue={hasMinScore ? minScore : 0} className="w-16" />
        </label>
        <label className="flex min-h-[44px] items-center gap-2 rounded-xl border border-white/[0.08] bg-[#141416] px-3 text-xs text-[rgba(245,245,242,0.65)]">
          Max
          <input type="range" name="max_score" min="0" max="2" defaultValue={hasMaxScore ? maxScore : 2} className="w-16" />
        </label>
        <button className="min-h-[44px] rounded-xl border border-white/[0.08] bg-[#141416] px-4 text-sm font-medium text-[#F5F5F2]">Search</button>
      </form>
      <SavedSearchBar surface="cases" q={q} />

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

      {filteredCases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-[rgba(245,245,242,0.5)] mb-1">{cases?.length ? 'No cases match these filters' : 'No cases logged yet'}</p>
          <p className="text-xs text-[rgba(245,245,242,0.55)] mb-6 max-w-xs">Start logging anonymised clinical cases. They will appear here as a journal timeline.</p>
          <Link href="/cases/new" className="min-h-[44px] flex items-center gap-2 bg-[#1B6FD9] hover:bg-[#155BB0] text-[#0B0B0C] font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors">
            Log your first case
          </Link>
        </div>
      ) : (
        <CasesListClient cases={filteredCases} userInterests={trackedSpecialtyKeys} />
      )}
    </div>
  )
}
