import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES, CATEGORY_COLOURS, type Category } from '@/lib/types/portfolio'
import EntryCard from '@/components/portfolio/entry-card'

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: { category?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const activeCategory = (searchParams.category as Category) ?? null

  let query = supabase
    .from('portfolio_entries')
    .select('*')
    .eq('user_id', user!.id)
    .order('date', { ascending: false })

  if (activeCategory) {
    query = query.eq('category', activeCategory)
  }

  const { data: entries } = await query

  // Count per category for the tab badges
  const { data: counts } = await supabase
    .from('portfolio_entries')
    .select('category')
    .eq('user_id', user!.id)

  const countMap: Record<string, number> = {}
  counts?.forEach(r => {
    countMap[r.category] = (countMap[r.category] ?? 0) + 1
  })
  const total = counts?.length ?? 0

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Portfolio</h1>
          <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">
            {total} {total === 1 ? 'entry' : 'entries'} logged
          </p>
        </div>
        <Link
          href="/portfolio/new"
          className="flex items-center gap-2 bg-[#1D9E75] hover:bg-[#178060] text-[#0B0B0C] font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add entry
        </Link>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap mb-6 pb-4 border-b border-white/[0.06]">
        <Link
          href="/portfolio"
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            !activeCategory
              ? 'bg-[#F5F5F2]/10 text-[#F5F5F2]'
              : 'text-[rgba(245,245,242,0.5)] hover:text-[#F5F5F2] hover:bg-white/[0.05]'
          }`}
        >
          All
          {total > 0 && (
            <span className="ml-1.5 text-[10px] text-[rgba(245,245,242,0.35)]">{total}</span>
          )}
        </Link>
        {CATEGORIES.map(cat => (
          <Link
            key={cat.value}
            href={`/portfolio?category=${cat.value}`}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeCategory === cat.value
                ? 'bg-[#F5F5F2]/10 text-[#F5F5F2]'
                : 'text-[rgba(245,245,242,0.5)] hover:text-[#F5F5F2] hover:bg-white/[0.05]'
            }`}
          >
            {cat.label}
            {countMap[cat.value] > 0 && (
              <span className="ml-1.5 text-[10px] text-[rgba(245,245,242,0.35)]">{countMap[cat.value]}</span>
            )}
          </Link>
        ))}
      </div>

      {/* Entry list */}
      {!entries || entries.length === 0 ? (
        <EmptyState category={activeCategory} />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {entries.map(entry => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ category }: { category: Category | null }) {
  const catMeta = category ? CATEGORIES.find(c => c.value === category) : null
  const colours = category ? CATEGORY_COLOURS[category] : null

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      </div>
      {catMeta && colours ? (
        <>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border mb-3 ${colours.badge}`}>
            {catMeta.label}
          </span>
          <p className="text-sm text-[rgba(245,245,242,0.5)] mb-1">No entries yet</p>
          <p className="text-xs text-[rgba(245,245,242,0.3)] mb-6">Log your first {catMeta.label.toLowerCase()} entry to get started.</p>
        </>
      ) : (
        <>
          <p className="text-sm text-[rgba(245,245,242,0.5)] mb-1">No portfolio entries yet</p>
          <p className="text-xs text-[rgba(245,245,242,0.3)] mb-6">Start logging your achievements to build your portfolio.</p>
        </>
      )}
      <Link
        href={category ? `/portfolio/new?category=${category}` : '/portfolio/new'}
        className="flex items-center gap-2 bg-[#1D9E75] hover:bg-[#178060] text-[#0B0B0C] font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add {catMeta ? catMeta.label.toLowerCase() : 'entry'}
      </Link>
    </div>
  )
}
