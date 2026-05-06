import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES, type Category, type PortfolioEntry } from '@/lib/types/portfolio'
import EntryCard from '@/components/portfolio/entry-card'
import PortfolioListClient from '@/components/portfolio/portfolio-list-client'
import { INTERVIEW_THEMES } from '@/lib/constants/interview-themes'
import SavedSearchBar from '@/components/search/saved-search-bar'
import { matchesParsedQuery, parseSearchQuery } from '@/lib/search/parser'
import { completenessScore, missingCompletenessFields } from '@/lib/utils/completeness'

type ViewMode = 'categories' | 'themes' | 'all'

function normaliseTheme(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: ViewMode; category?: string; q?: string; complete?: string; min_score?: string; max_score?: string; missing?: string; ready?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const view = resolvedSearchParams.view ?? 'categories'
  const activeCategory = (resolvedSearchParams.category as Category | undefined) ?? undefined
  const q = resolvedSearchParams.q ?? ''
  const completeOnly = resolvedSearchParams.complete === '1'
  const minScore = resolvedSearchParams.min_score ? Number(resolvedSearchParams.min_score) : undefined
  const maxScore = resolvedSearchParams.max_score ? Number(resolvedSearchParams.max_score) : undefined
  const hasMinScore = minScore !== undefined && Number.isFinite(minScore)
  const hasMaxScore = maxScore !== undefined && Number.isFinite(maxScore)
  const missing = resolvedSearchParams.missing ?? ''
  const readyFilter = resolvedSearchParams.ready ?? ''

  const [{ data: entries }, { data: customThemes }, { data: trackedSpecialtyRows }, { data: evidenceFiles }] = await Promise.all([
    supabase
      .from('portfolio_entries')
      .select('id, user_id, category, title, date, specialty_tags, notes, pinned, completeness_score, deleted_at, created_at, updated_at, audit_type, audit_role, audit_cycle_stage, audit_trust, audit_outcome, audit_presented, teaching_type, teaching_audience, teaching_setting, teaching_event, teaching_invited, conf_type, conf_event_name, conf_attendance, conf_level, conf_cpd_hours, conf_certificate, pub_type, pub_journal, pub_authors, pub_status, pub_doi, leader_role, leader_organisation, leader_start_date, leader_end_date, leader_ongoing, prize_body, prize_level, prize_description, proc_name, proc_setting, proc_supervision, proc_count, refl_type, refl_framework, refl_clinical_context, refl_supervisor, refl_free_text, custom_free_text, interview_themes, interview_ready_for')
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .order('pinned', { ascending: false })
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('custom_competency_themes')
      .select('name, slug, colour')
      .eq('user_id', user!.id)
      .order('name', { ascending: true }),
    supabase
      .from('specialty_applications')
      .select('specialty_key')
      .eq('user_id', user!.id)
      .eq('is_active', true),
    supabase
      .from('evidence_files')
      .select('entry_id, file_name')
      .eq('user_id', user!.id)
      .eq('entry_type', 'portfolio'),
  ])

  const fileNamesByEntry = new Map<string, string[]>()
  ;(evidenceFiles ?? []).forEach(file => {
    fileNamesByEntry.set(file.entry_id, [...(fileNamesByEntry.get(file.entry_id) ?? []), file.file_name])
  })
  const parsedQuery = parseSearchQuery(q)
  parsedQuery.completeness = {
    ...(parsedQuery.completeness ?? {}),
    ...(completeOnly ? { exact: 2 } : {}),
    ...(hasMinScore ? { min: minScore } : {}),
    ...(hasMaxScore ? { max: maxScore } : {}),
  }
  if (missing) parsedQuery.missing = missing.toLowerCase()

  const allEntries = ((entries ?? []) as PortfolioEntry[]).filter(entry => {
    if (view === 'categories' && activeCategory && entry.category !== activeCategory) return false
    if (readyFilter && !(entry.interview_ready_for ?? []).includes(readyFilter)) return false
    const scoredEntry = entry.completeness_score ?? completenessScore(entry, 'portfolio')
    if (!matchesParsedQuery(
      { ...entry, file_names: fileNamesByEntry.get(entry.id) ?? [] },
      parsedQuery,
      { completenessScore: scoredEntry, missingFields: missingCompletenessFields(entry, 'portfolio') },
    )) return false
    return true
  })

  const countMap = (entries ?? []).reduce((acc: Record<string, number>, entry) => {
    acc[entry.category] = (acc[entry.category] ?? 0) + 1
    return acc
  }, {})

  const themes = [
    ...INTERVIEW_THEMES.map(name => ({ name, slug: normaliseTheme(name), colour: null as string | null })),
    ...(customThemes ?? []).map(theme => ({ name: theme.name, slug: normaliseTheme(theme.slug), colour: theme.colour ?? '#1B6FD9' })),
  ]
  const trackedSpecialtyKeys = (trackedSpecialtyRows ?? []).map(row => row.specialty_key)

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Portfolio</h1>
          <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">{entries?.length ?? 0} entries logged</p>
        </div>
        <Link href={activeCategory ? `/portfolio/new?category=${activeCategory}` : '/portfolio/new'} className="min-h-[44px] flex items-center gap-2 bg-[#1B6FD9] hover:bg-[#155BB0] text-[#0B0B0C] font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors">
          <span className="text-lg leading-none">+</span>
          Add entry
        </Link>
      </div>

      <form className="mb-3 flex flex-wrap gap-2">
        <input type="hidden" name="view" value={view} />
        {activeCategory && <input type="hidden" name="category" value={activeCategory} />}
        <input name="q" defaultValue={q} placeholder="Search portfolio" className="min-h-[44px] flex-1 rounded-xl border border-white/[0.08] bg-[#141416] px-4 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.3)] outline-none focus:border-[#1B6FD9]" />
        <label className="flex min-h-[44px] items-center gap-2 rounded-xl border border-white/[0.08] bg-[#141416] px-3 text-xs text-[rgba(245,245,242,0.65)]">
          <input type="checkbox" name="complete" value="1" defaultChecked={completeOnly} />
          Green only
        </label>
        <select name="missing" defaultValue={missing} className="min-h-[44px] rounded-xl border border-white/[0.08] bg-[#141416] px-3 text-sm text-[#F5F5F2]">
          <option value="">Any fields</option>
          <option value="notes">Missing notes</option>
          <option value="specialty tags">Missing tags</option>
          <option value="audit cycle stage">Missing audit stage</option>
          <option value="date">Missing date</option>
        </select>
        <select name="ready" defaultValue={readyFilter} className="min-h-[44px] rounded-xl border border-white/[0.08] bg-[#141416] px-3 text-sm text-[#F5F5F2]">
          <option value="">Any portfolio</option>
          <option value="imt">Interview-ready: IMT</option>
          <option value="st_application">Interview-ready: ST application</option>
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
      <SavedSearchBar surface="portfolio" q={q} />

      <div className="mb-6 flex flex-wrap gap-2 border-b border-white/[0.06] pb-4">
        <ViewLink href="/portfolio" active={view === 'categories'} label="Categories" />
        <ViewLink href="/portfolio?view=themes" active={view === 'themes'} label="Themes" />
        <ViewLink href="/portfolio?view=all" active={view === 'all'} label="All" />
      </div>

      {view === 'categories' && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          <ViewLink href="/portfolio" active={!activeCategory} label={`All ${entries?.length ?? 0}`} />
          {CATEGORIES.map(category => (
            <ViewLink
              key={category.value}
              href={`/portfolio?category=${category.value}`}
              active={activeCategory === category.value}
              label={`${category.label} ${countMap[category.value] ?? 0}`}
            />
          ))}
        </div>
      )}

      {view === 'themes' ? (
        <div className="space-y-5">
          {themes.map(theme => {
            const matching = allEntries.filter(entry => (entry.interview_themes ?? []).map(normaliseTheme).includes(theme.slug))
            if (matching.length === 0) return null
            return (
              <section key={theme.slug} className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5">
                <details open>
                  <summary className="cursor-pointer text-sm font-semibold text-[#F5F5F2]">
                    {theme.colour && <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: theme.colour }} />}
                    {theme.name} <span className="text-[rgba(245,245,242,0.35)]">({matching.length})</span>
                  </summary>
                  <div className="mt-4 space-y-3">
                    {matching.map(entry => <EntryCard key={entry.id} entry={entry} />)}
                  </div>
                </details>
              </section>
            )
          })}
          {themes.every(theme => allEntries.filter(entry => (entry.interview_themes ?? []).map(normaliseTheme).includes(theme.slug)).length === 0) && (
            <EmptyPortfolio />
          )}
        </div>
      ) : (
        <div>
          <PortfolioListClient entries={allEntries} userInterests={trackedSpecialtyKeys} />
          {allEntries.length === 0 && <EmptyPortfolio />}
        </div>
      )}
    </div>
  )
}

function ViewLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href} className={`min-h-[36px] rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? 'bg-[#F5F5F2]/10 text-[#F5F5F2]' : 'text-[rgba(245,245,242,0.5)] hover:bg-white/[0.05] hover:text-[#F5F5F2]'}`}>
      {label}
    </Link>
  )
}

function EmptyPortfolio() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#141416] p-10 text-center">
      <p className="text-sm text-[rgba(245,245,242,0.5)]">No portfolio entries in this view.</p>
    </div>
  )
}
