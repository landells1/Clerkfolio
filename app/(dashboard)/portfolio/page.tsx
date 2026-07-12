import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES, type Category, type PortfolioEntry } from '@/lib/types/portfolio'
import EntryCard from '@/components/portfolio/entry-card'
import PortfolioListClient from '@/components/portfolio/portfolio-list-client'
import { COMPETENCY_THEMES } from '@/lib/constants/competency-themes'
import SavedSearchBar from '@/components/search/saved-search-bar'
import PullToRefresh from '@/components/ui/pull-to-refresh'
import SectionHeader from '@/components/ui/section-header'
import CategoryTileGrid from '@/components/portfolio/category-tile-grid'
import { matchesParsedQuery, parseSearchQuery } from '@/lib/search/parser'
import { missingCompletenessFields } from '@/lib/utils/completeness'
import { isImportance } from '@/lib/types/importance'

type ViewMode = 'categories' | 'themes' | 'all'

function normaliseTheme(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: ViewMode; category?: string; q?: string; importance?: string; missing?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const view = resolvedSearchParams.view ?? 'categories'
  const activeCategory = (resolvedSearchParams.category as Category | undefined) ?? undefined
  const q = resolvedSearchParams.q ?? ''
  const importanceFilter = isImportance(resolvedSearchParams.importance) ? resolvedSearchParams.importance : ''
  const missing = resolvedSearchParams.missing ?? ''

  const [{ data: entries }, { data: customThemes }, { data: trackedSpecialtyRows }, { data: evidenceFiles }] = await Promise.all([
    supabase
      .from('portfolio_entries')
      .select('id, user_id, category, title, date, specialty_tags, notes, pinned, importance, deleted_at, created_at, updated_at, audit_type, audit_role, audit_cycle_stage, audit_trust, audit_outcome, audit_presented, teaching_type, teaching_audience, teaching_setting, teaching_event, teaching_invited, conf_type, conf_event_name, conf_attendance, conf_level, conf_cpd_hours, conf_certificate, pub_type, pub_journal, pub_authors, pub_status, pub_doi, leader_role, leader_organisation, leader_start_date, leader_end_date, leader_ongoing, prize_body, prize_level, prize_description, proc_name, proc_setting, proc_supervision, proc_count, refl_type, refl_framework, refl_clinical_context, refl_supervisor, refl_free_text, custom_free_text, interview_themes')
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
    // Resolve evidence per entry through the join table so files reused across
    // entries show on every entry they're linked to (not only where uploaded).
    supabase
      .from('evidence_file_links')
      .select('entry_id, evidence_files!inner(file_name, user_id)')
      .eq('entry_type', 'portfolio')
      .eq('evidence_files.user_id', user!.id),
  ])

  const fileNamesByEntry = new Map<string, string[]>()
  ;(evidenceFiles ?? []).forEach((link: { entry_id: string; evidence_files: { file_name: string } | { file_name: string }[] | null }) => {
    const ef = Array.isArray(link.evidence_files) ? link.evidence_files[0] : link.evidence_files
    if (!ef) return
    fileNamesByEntry.set(link.entry_id, [...(fileNamesByEntry.get(link.entry_id) ?? []), ef.file_name])
  })
  const parsedQuery = parseSearchQuery(q)
  if (missing) parsedQuery.missing = missing.toLowerCase()

  const allEntries = ((entries ?? []) as PortfolioEntry[]).filter(entry => {
    if (view === 'categories' && activeCategory && entry.category !== activeCategory) return false
    if (importanceFilter && entry.importance !== importanceFilter) return false
    if (!matchesParsedQuery(
      { ...entry, file_names: fileNamesByEntry.get(entry.id) ?? [] },
      parsedQuery,
      { missingFields: missingCompletenessFields(entry, 'portfolio') },
    )) return false
    return true
  })

  const countMap = (entries ?? []).reduce((acc: Record<string, number>, entry) => {
    acc[entry.category] = (acc[entry.category] ?? 0) + 1
    return acc
  }, {})

  const themes = [
    ...COMPETENCY_THEMES.map(name => ({ name, slug: normaliseTheme(name), colour: null as string | null })),
    ...(customThemes ?? []).map(theme => ({ name: theme.name, slug: normaliseTheme(theme.slug), colour: theme.colour ?? '#1B6FD9' })),
  ]
  const trackedSpecialtyKeys = (trackedSpecialtyRows ?? []).map(row => row.specialty_key)

  return (
    <PullToRefresh className="p-6 lg:p-8 max-w-container mx-auto w-full">
      <SectionHeader
        title="Portfolio"
        sub={`${entries?.length ?? 0} ${(entries?.length ?? 0) === 1 ? 'entry' : 'entries'} logged`}
        actions={
          <Link
            href={activeCategory ? `/portfolio/new?category=${activeCategory}` : '/portfolio/new'}
            prefetch={false}
            className="min-h-[44px] flex items-center gap-2 bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] text-[var(--button-primary-text)] font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            Add entry
          </Link>
        }
      />

      <form className="mb-3 flex flex-wrap gap-2">
        <input type="hidden" name="view" value={view} />
        {activeCategory && <input type="hidden" name="category" value={activeCategory} />}
        <input name="q" defaultValue={q} placeholder="Search portfolio" className="min-h-[44px] flex-1 rounded-lg border border-subtle bg-surface-1 px-4 text-sm text-fg placeholder-fg-2 outline-none focus:border-strong" />
        <select name="importance" defaultValue={importanceFilter} aria-label="Importance" className="min-h-[44px] rounded-lg border border-subtle bg-surface-1 px-3 text-sm text-fg">
          <option value="">Any importance</option>
          <option value="high">Importance: High</option>
          <option value="medium">Importance: Medium</option>
          <option value="low">Importance: Low</option>
        </select>
        <select name="missing" defaultValue={missing} className="min-h-[44px] rounded-lg border border-subtle bg-surface-1 px-3 text-sm text-fg">
          <option value="">Any fields</option>
          <option value="notes">Missing notes</option>
          <option value="specialty tags">Missing tags</option>
          <option value="audit cycle stage">Missing audit stage</option>
          <option value="date">Missing date</option>
        </select>
        <button className="min-h-[44px] rounded-lg border border-subtle bg-surface-1 px-4 text-sm font-medium text-fg">Search</button>
      </form>
      <SavedSearchBar surface="portfolio" q={q} />

      <div className="mb-6 flex flex-wrap gap-2 border-b border-subtle pb-4">
        <ViewLink href="/portfolio" active={view === 'categories'} label="Categories" />
        <ViewLink href="/portfolio?view=themes" active={view === 'themes'} label="Themes" />
        <ViewLink href="/portfolio?view=all" active={view === 'all'} label="All" />
      </div>

      {view === 'categories' && !activeCategory && (
        <CategoryTileGrid entries={(entries ?? []).map(e => ({ category: e.category as Category, date: e.date, created_at: e.created_at }))} />
      )}
      {view === 'categories' && activeCategory && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          <ViewLink href="/portfolio" active={false} label={`← All ${entries?.length ?? 0}`} />
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
              <section key={theme.slug} className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-5">
                <details open>
                  <summary className="cursor-pointer text-sm font-semibold text-[var(--text-primary)]">
                    {theme.colour && <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: theme.colour }} />}
                    {theme.name} <span className="text-[var(--text-secondary)]">({matching.length})</span>
                  </summary>
                  <div className="mt-4 space-y-3">
                    {matching.map(entry => <EntryCard key={entry.id} entry={entry} />)}
                  </div>
                </details>
              </section>
            )
          })}
          {themes.every(theme => allEntries.filter(entry => (entry.interview_themes ?? []).map(normaliseTheme).includes(theme.slug)).length === 0) && (
            (entries?.length ?? 0) === 0 ? <EmptyPortfolio /> : <EmptyThemes />
          )}
        </div>
      ) : (
        <div>
          <PortfolioListClient entries={allEntries} userInterests={trackedSpecialtyKeys} />
          {allEntries.length === 0 && <EmptyPortfolio />}
        </div>
      )}
    </PullToRefresh>
  )
}

function ViewLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  // prefetch={false}: these view tabs and category chips are all query-param
  // variants of this one expensive load-all route. Default prefetch fires an RSC
  // render for every variant on page load (~24 requests, tripping platform 503s
  // under the burst) — the BUG-001 / F-032 prefetch storm. The click still works
  // (it fetches on demand); we just stop pre-rendering every sibling variant.
  return (
    <Link href={href} prefetch={false} className={`min-h-[36px] rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? 'bg-surface-3 text-fg' : 'text-fg-2 hover:bg-surface-2 hover:text-fg'}`}>
      {label}
    </Link>
  )
}

function EmptyPortfolio() {
  return (
    <div className="rounded-lg border border-subtle bg-surface-1 p-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-subtle bg-surface-2">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-fg-2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-fg">Your portfolio lives here</p>
      <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-fg-2">
        Log audits, teaching, courses, publications, prizes, procedures and reflections. Filter by category once you have a few entries.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/portfolio/new"
          prefetch={false}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--button-primary-bg)] px-4 py-2 text-sm font-semibold text-[var(--button-primary-text)] hover:bg-[var(--button-primary-bg-hover)] transition-colors"
        >
          Add your first entry
        </Link>
        <Link
          href="/import"
          prefetch={false}
          className="inline-flex items-center gap-2 rounded-lg border border-subtle bg-surface-1 px-4 py-2 text-sm font-medium text-fg hover:border-default transition-colors"
        >
          Import existing portfolio
        </Link>
      </div>
    </div>
  )
}

// Themes-specific empty state: entries exist but none carry a competency theme
// tag yet, so the full "Add your first entry" EmptyPortfolio would be
// misleading. Points the user at tagging their existing entries instead.
function EmptyThemes() {
  return (
    <div className="rounded-lg border border-subtle bg-surface-1 p-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-subtle bg-surface-2">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-fg-2">
          <path d="M20.59 13.41 11 22 2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      </div>
      <p className="text-sm font-medium text-fg">No competency themes tagged yet</p>
      <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-fg-2">
        You have entries, but none are tagged with a competency theme. Open an existing entry and add themes like Leadership or Teaching to see them grouped here.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/portfolio?view=all"
          prefetch={false}
          className="inline-flex items-center gap-2 rounded-lg border border-subtle bg-surface-1 px-4 py-2 text-sm font-medium text-fg hover:border-default transition-colors"
        >
          View all entries
        </Link>
      </div>
    </div>
  )
}
