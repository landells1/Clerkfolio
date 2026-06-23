import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CasesListClient from '@/components/cases/cases-list-client'
import DraftResumeBanner from '@/components/cases/draft-resume-banner'
import type { Case } from '@/lib/types/cases'
import SavedSearchBar from '@/components/search/saved-search-bar'
import PullToRefresh from '@/components/ui/pull-to-refresh'
import SectionHeader from '@/components/ui/section-header'
import StatTile from '@/components/ui/stat-tile'
import { matchesParsedQuery, parseSearchQuery } from '@/lib/search/parser'
import { missingCompletenessFields } from '@/lib/utils/completeness'
import { isImportance } from '@/lib/types/importance'

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; importance?: string; missing?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const q = resolvedSearchParams.q ?? ''
  const importanceFilter = isImportance(resolvedSearchParams.importance) ? resolvedSearchParams.importance : ''
  const missing = resolvedSearchParams.missing ?? ''

  const [{ data: cases }, { data: allCasesMeta }, { data: trackedSpecialtyRows }, { data: evidenceFiles }] = await Promise.all([
    supabase
      .from('cases')
      .select('id, user_id, title, date, clinical_domain, clinical_domains, specialty_tags, notes, pinned, importance, deleted_at, created_at, updated_at, interview_themes')
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('cases')
      .select('clinical_domain, clinical_domains, specialty_tags, created_at')
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
  if (missing) parsedQuery.missing = missing.toLowerCase()
  const filteredCases = ((cases ?? []) as Case[]).filter(c => {
    if (importanceFilter && c.importance !== importanceFilter) return false
    return matchesParsedQuery(
      { ...c, file_names: fileNamesByCase.get(c.id) ?? [] },
      parsedQuery,
      { missingFields: missingCompletenessFields(c, 'case') },
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

  // StatTile metrics for the header row
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const thisMonthCount = (allCasesMeta ?? []).filter(c => {
    const d = (c as { created_at?: string }).created_at
    return d && d.startsWith(thisMonthKey)
  }).length
  // Average per week, measured over the account's real lifetime (weeks since
  // signup) rather than a forced 52-week window — so a days-old account with a
  // few cases shows a sensible figure, not "0" (F-019). The tile is hidden until
  // the account is ~2 weeks old so the first number shown is meaningful.
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const accountAgeMs = user?.created_at ? now.getTime() - new Date(user.created_at).getTime() : 0
  const weeksSinceSignup = Math.max(1, accountAgeMs / weekMs)
  const showAvgPerWeek = accountAgeMs >= 14 * 24 * 60 * 60 * 1000
  const avgPerWeek = total === 0 ? 0 : Math.round((total / weeksSinceSignup) * 10) / 10

  return (
    <PullToRefresh className="p-6 lg:p-8 max-w-container mx-auto w-full">
      <SectionHeader
        title="Cases"
        sub={`${total} ${total === 1 ? 'case' : 'cases'} logged`}
        actions={
          <Link
            href="/cases/new"
            className="min-h-[44px] flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-surface-0 font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            Log case
          </Link>
        }
      />

      <div className={`grid ${showAvgPerWeek ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mb-6`}>
        <StatTile label="Total cases" value={total} sub="all time" barColour="blue" />
        <StatTile label="This month" value={thisMonthCount} sub={now.toLocaleDateString('en-GB', { month: 'long' })} barColour="violet" />
        {showAvgPerWeek && (
          <StatTile label="Avg per week" value={avgPerWeek} sub="since you joined" barColour="amber" />
        )}
      </div>

      <form className="mb-3 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search cases" className="min-h-[44px] flex-1 rounded-lg border border-subtle bg-surface-1 px-4 text-sm text-fg placeholder-fg-2 outline-none focus:border-strong" />
        <select name="importance" defaultValue={importanceFilter} aria-label="Importance" className="min-h-[44px] rounded-lg border border-subtle bg-surface-1 px-3 text-sm text-fg">
          <option value="">Any importance</option>
          <option value="high">Importance: High</option>
          <option value="medium">Importance: Medium</option>
          <option value="low">Importance: Low</option>
        </select>
        <select name="missing" defaultValue={missing} className="min-h-[44px] rounded-lg border border-subtle bg-surface-1 px-3 text-sm text-fg">
          <option value="">Any fields</option>
          <option value="notes">Missing notes</option>
          <option value="clinical domain">Missing domain</option>
          <option value="date">Missing date</option>
        </select>
        <button className="min-h-[44px] rounded-lg border border-subtle bg-surface-1 px-4 text-sm font-medium text-fg">Search</button>
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

      <DraftResumeBanner userId={user!.id} />

      {filteredCases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-fg-1 mb-1">{cases?.length ? 'No cases match these filters' : 'No cases logged yet'}</p>
          <p className="text-xs text-fg-2 mb-6 max-w-xs">Start logging anonymised clinical cases. They will appear here as a journal timeline.</p>
          <Link href="/cases/new" className="min-h-[44px] flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-surface-0 font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors">
            Log your first case
          </Link>
        </div>
      ) : (
        <CasesListClient cases={filteredCases} userInterests={trackedSpecialtyKeys} />
      )}
    </PullToRefresh>
  )
}
