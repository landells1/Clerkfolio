import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES, type Category, type PortfolioEntry } from '@/lib/types/portfolio'
import EntryCard from '@/components/portfolio/entry-card'
import { INTERVIEW_THEMES } from '@/lib/constants/interview-themes'

type ViewMode = 'categories' | 'themes' | 'all'

function normaliseTheme(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: ViewMode; category?: string; q?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const view = resolvedSearchParams.view ?? 'categories'
  const activeCategory = (resolvedSearchParams.category as Category | undefined) ?? undefined
  const q = resolvedSearchParams.q ?? ''

  const [{ data: entries }, { data: customThemes }] = await Promise.all([
    supabase
      .from('portfolio_entries')
      .select('*')
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .order('pinned', { ascending: false })
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('custom_competency_themes')
      .select('name, slug')
      .eq('user_id', user!.id)
      .order('name', { ascending: true }),
  ])

  const allEntries = ((entries ?? []) as PortfolioEntry[]).filter(entry => {
    if (q && !`${entry.title} ${entry.notes ?? ''}`.toLowerCase().includes(q.toLowerCase())) return false
    if (view === 'categories' && activeCategory && entry.category !== activeCategory) return false
    return true
  })

  const countMap = (entries ?? []).reduce((acc: Record<string, number>, entry) => {
    acc[entry.category] = (acc[entry.category] ?? 0) + 1
    return acc
  }, {})

  const themes = [
    ...INTERVIEW_THEMES.map(name => ({ name, slug: normaliseTheme(name) })),
    ...(customThemes ?? []).map(theme => ({ name: theme.name, slug: normaliseTheme(theme.slug) })),
  ]

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

      <form className="mb-4 flex gap-2">
        <input type="hidden" name="view" value={view} />
        {activeCategory && <input type="hidden" name="category" value={activeCategory} />}
        <input name="q" defaultValue={q} placeholder="Search portfolio" className="min-h-[44px] flex-1 rounded-xl border border-white/[0.08] bg-[#141416] px-4 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.3)] outline-none focus:border-[#1B6FD9]" />
        <button className="min-h-[44px] rounded-xl border border-white/[0.08] bg-[#141416] px-4 text-sm font-medium text-[#F5F5F2]">Search</button>
      </form>

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
                  <summary className="cursor-pointer text-sm font-semibold text-[#F5F5F2]">{theme.name} <span className="text-[rgba(245,245,242,0.35)]">({matching.length})</span></summary>
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
        <div className="space-y-3">
          {allEntries.map(entry => <EntryCard key={entry.id} entry={entry} />)}
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
