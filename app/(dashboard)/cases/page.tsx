import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CasesListClient from '@/components/cases/cases-list-client'
import DraftResumeBanner from '@/components/cases/draft-resume-banner'
import type { Case } from '@/lib/types/cases'
import SavedSearchBar from '@/components/search/saved-search-bar'
import PullToRefresh from '@/components/ui/pull-to-refresh'
import SectionHeader from '@/components/ui/section-header'
import FilterBanner from '@/components/search/filter-banner'
import StatTile from '@/components/ui/stat-tile'
import { matchesParsedQuery, parseSearchQuery } from '@/lib/search/parser'
import { missingCompletenessFields } from '@/lib/utils/completeness'
import { isImportance } from '@/lib/types/importance'
import { averagePerWeek, countInCurrentMonth } from '@/lib/dashboard/date-stats'
import { londonDateKey } from '@/lib/engagement/streaks'
import { CASE_MISSING_OPTIONS, missingFilterLabel } from '@/lib/search/missing-filter'
import { COMPETENCY_THEMES } from '@/lib/constants/competency-themes'
import { formatCompetencyTheme } from '@/lib/types/portfolio-labels'
import { countLabel } from '@/lib/utils/plural'

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; importance?: string; missing?: string; theme?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const q = resolvedSearchParams.q ?? ''
  const importanceFilter = isImportance(resolvedSearchParams.importance) ? resolvedSearchParams.importance : ''
  const missing = resolvedSearchParams.missing ?? ''
  const themeFilter = resolvedSearchParams.theme ?? ''

  const [{ data: cases }, { data: allCasesMeta }, { data: trackedSpecialtyRows }, { data: evidenceFiles }, { data: customThemes }] = await Promise.all([
    supabase
      .from('cases')
      .select('id, user_id, title, date, clinical_domain, clinical_domains, specialty_tags, notes, pinned, importance, deleted_at, created_at, updated_at, interview_themes')
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .order('pinned', { ascending: false })
      // By case date (like /portfolio), not creation time: imported or
      // backdated cases otherwise all bunched under the import month.
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('cases')
      .select('clinical_domain, clinical_domains, specialty_tags, date, is_demo')
      .eq('user_id', user!.id)
      .is('deleted_at', null),
    supabase
      .from('specialty_applications')
      .select('specialty_key')
      .eq('user_id', user!.id),
    // Resolve evidence per case through the join table so reused files show on
    // every case they're linked to (not only where uploaded).
    supabase
      .from('evidence_file_links')
      .select('entry_id, evidence_files!inner(file_name, user_id)')
      .eq('entry_type', 'case')
      .eq('evidence_files.user_id', user!.id),
    supabase
      .from('custom_competency_themes')
      .select('slug, name')
      .eq('user_id', user!.id)
      .order('name', { ascending: true }),
  ])
  const fileNamesByCase = new Map<string, string[]>()
  ;(evidenceFiles ?? []).forEach((link: { entry_id: string; evidence_files: { file_name: string } | { file_name: string }[] | null }) => {
    const ef = Array.isArray(link.evidence_files) ? link.evidence_files[0] : link.evidence_files
    if (!ef) return
    fileNamesByCase.set(link.entry_id, [...(fileNamesByCase.get(link.entry_id) ?? []), ef.file_name])
  })
  const parsedQuery = parseSearchQuery(q)
  if (missing) parsedQuery.missing = missing.toLowerCase()
  const filteredCases = ((cases ?? []) as Case[]).filter(c => {
    if (importanceFilter && c.importance !== importanceFilter) return false
    if (themeFilter && !(c.interview_themes ?? []).includes(themeFilter)) return false
    return matchesParsedQuery(
      { ...c, file_names: fileNamesByCase.get(c.id) ?? [] },
      parsedQuery,
      { missingFields: missingCompletenessFields(c, 'case'), recordType: 'case' },
    )
  })
  const themeOptions = [
    ...COMPETENCY_THEMES.map(theme => ({ value: theme as string, label: theme as string })),
    ...(customThemes ?? []).map(theme => ({ value: theme.slug, label: theme.name })),
  ]
  const activeFilterLabels = [
    importanceFilter ? `Importance: ${importanceFilter}` : null,
    missing ? missingFilterLabel(missing, 'case') : null,
    themeFilter ? `Theme: ${formatCompetencyTheme(themeFilter, customThemes ?? [])}` : null,
    q ? `Search: ${q}` : null,
  ].filter((label): label is string => Boolean(label))

  const domainCountMap: Record<string, number> = {}
  allCasesMeta?.forEach(c => {
    const domains: string[] = (c as { clinical_domains?: string[] }).clinical_domains?.length
      ? (c as { clinical_domains: string[] }).clinical_domains
      : c.clinical_domain ? [c.clinical_domain] : []
    domains.forEach(domain => { domainCountMap[domain] = (domainCountMap[domain] ?? 0) + 1 })
  })

  const trackedSpecialtyKeys = (trackedSpecialtyRows ?? []).map(row => row.specialty_key)
  const total = allCasesMeta?.length ?? 0

  // StatTile metrics for the header row - by each case's own date (see
  // lib/dashboard/date-stats.ts), so backfilled cases land in the month they
  // happened. Demo cases never count.
  const now = new Date()
  const todayKey = londonDateKey(now)
  const realCaseDates = (allCasesMeta ?? []).filter(c => !(c as { is_demo?: boolean }).is_demo) as { date: string }[]
  const thisMonthCount = countInCurrentMonth(realCaseDates, todayKey)
  // Average per week from the earlier of the first case date and signup, up
  // to today; hidden until that span is two weeks long (F-019).
  const avgPerWeek = averagePerWeek(realCaseDates, todayKey, user?.created_at ?? null)
  const showAvgPerWeek = avgPerWeek !== null

  return (
    <PullToRefresh className="p-6 lg:p-8 max-w-container mx-auto w-full">
      <SectionHeader
        title="Cases"
        sub={activeFilterLabels.length > 0 ? `${filteredCases.length} of ${countLabel(total, 'case')}` : `${countLabel(total, 'case')} logged`}
        actions={
          <Link
            href="/cases/new"
            className="min-h-[44px] flex items-center gap-2 bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] text-[var(--button-primary-text)] font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            Log case
          </Link>
        }
      />

      <div className={`grid ${showAvgPerWeek ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'} gap-3 mb-6`}>
        <StatTile label="Total cases" value={total} sub="all time" barColour="blue" />
        <StatTile label="This month" value={thisMonthCount} sub={`dated in ${now.toLocaleDateString('en-GB', { month: 'long' })}`} barColour="violet" />
        {showAvgPerWeek && (
          <StatTile label="Avg per week" value={avgPerWeek ?? 0} sub="since your first case" barColour="amber" />
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
        <select name="theme" defaultValue={themeFilter} aria-label="Competency theme" className="min-h-[44px] rounded-lg border border-subtle bg-surface-1 px-3 text-sm text-fg">
          <option value="">Any theme</option>
          {themeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select name="missing" defaultValue={missing} aria-label="Missing fields" className="min-h-[44px] rounded-lg border border-subtle bg-surface-1 px-3 text-sm text-fg">
          <option value="">Any fields</option>
          {CASE_MISSING_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <button className="min-h-[44px] rounded-lg border border-subtle bg-surface-1 px-4 text-sm font-medium text-fg">Search</button>
      </form>
      <SavedSearchBar surface="cases" q={q} showFilteredChip={false} />
      {activeFilterLabels.length > 0 && <FilterBanner labels={activeFilterLabels} shown={filteredCases.length} total={total} singular="case" plural="cases" clearHref="/cases" />}

      {Object.keys(domainCountMap).length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-6 text-xs text-[var(--text-muted)]">
          {Object.entries(domainCountMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6)
            .map(([domain, count]) => (
              <span key={domain}><span className="text-[var(--text-secondary)]">{count}</span> {domain}</span>
            ))}
        </div>
      )}

      <DraftResumeBanner userId={user!.id} />

      {filteredCases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-fg-1 mb-1">{cases?.length ? 'No cases match these filters' : 'No cases logged yet'}</p>
          <p className="text-xs text-fg-2 mb-6 max-w-xs">Start logging anonymised clinical cases. They will appear here as a journal timeline.</p>
          <Link href="/cases/new" className="min-h-[44px] flex items-center gap-2 bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] text-[var(--button-primary-text)] font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors">
            Log your first case
          </Link>
        </div>
      ) : (
        <CasesListClient cases={filteredCases} userInterests={trackedSpecialtyKeys} />
      )}
    </PullToRefresh>
  )
}
