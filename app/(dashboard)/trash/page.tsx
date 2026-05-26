import { createClient } from '@/lib/supabase/server'
import TrashRow, { type TrashItem } from '@/components/trash/trash-row'
import EmptyTrashButton from '@/components/trash/empty-trash-button'
import { CATEGORIES, type Category } from '@/lib/types/portfolio'
import { titleCase } from '@/lib/types/portfolio-labels'
import PullToRefresh from '@/components/ui/pull-to-refresh'

export default async function TrashPage({
  searchParams,
}: {
  searchParams: Promise<{ recent?: string; category?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: deletedEntries }, { data: deletedCases }] = await Promise.all([
    supabase.from('portfolio_entries').select('id, title, category, date, deleted_at')
      .eq('user_id', user!.id).not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
    supabase.from('cases').select('id, title, clinical_domain, clinical_domains, date, deleted_at')
      .eq('user_id', user!.id).not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
  ])

  const items: TrashItem[] = [
    ...(deletedEntries ?? []).map(entry => ({
      id: entry.id,
      title: entry.title,
      subtitle: CATEGORIES.find(c => c.value === entry.category as Category)?.label ?? (entry.category ? titleCase(entry.category) : null) ?? 'Portfolio entry',
      category: entry.category ?? null,
      date: entry.date,
      deletedAt: entry.deleted_at,
      type: 'entry' as const,
    })),
    ...(deletedCases ?? []).map(c => ({
      id: c.id,
      title: c.title,
      subtitle: c.clinical_domains?.length ? c.clinical_domains.join(', ') : c.clinical_domain ?? 'Case',
      category: null,
      date: c.date,
      deletedAt: c.deleted_at,
      type: 'case' as const,
    })),
  ].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
  const recentOnly = resolvedSearchParams.recent === '7'
  const activeCategory = resolvedSearchParams.category ?? ''
  const filteredItems = items.filter(item => {
    if (recentOnly && Date.now() - new Date(item.deletedAt).getTime() > 7 * 86400000) return false
    if (activeCategory && item.category !== activeCategory) return false
    return true
  })

  const totalItems = filteredItems.length
  const permanentDeleteCutoff = Date.now() - 30 * 86_400_000
  const eligibleItems = items.filter(item => new Date(item.deletedAt).getTime() <= permanentDeleteCutoff)
  const retainedItems = items.filter(item => new Date(item.deletedAt).getTime() > permanentDeleteCutoff)
  const nextEligibleAt = retainedItems.length > 0
    ? retainedItems.reduce((next, item) => item.deletedAt < next ? item.deletedAt : next, retainedItems[0].deletedAt)
    : null
  const totals = {
    entry: filteredItems.filter(item => item.type === 'entry').length,
    case: filteredItems.filter(item => item.type === 'case').length,
  }

  return (
    <PullToRefresh className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Trash</h1>
        <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">
          {totalItems === 0 ? 'Trash is empty' : `${totalItems} deleted ${totalItems === 1 ? 'item' : 'items'}`}
        </p>
      </div>

      <form className="mb-6 flex flex-wrap gap-2">
        <label className="flex min-h-[44px] items-center gap-2 rounded-xl border border-white/[0.08] bg-[#141416] px-3 text-xs text-[rgba(245,245,242,0.65)]">
          <input type="checkbox" name="recent" value="7" defaultChecked={recentOnly} />
          Deleted last 7 days
        </label>
        <select name="category" defaultValue={activeCategory} className="min-h-[44px] rounded-xl border border-white/[0.08] bg-[#141416] px-3 text-sm text-[#F5F5F2]">
          <option value="">Any category</option>
          {CATEGORIES.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
        </select>
        <button className="min-h-[44px] rounded-xl border border-white/[0.08] bg-[#141416] px-4 text-sm font-medium text-[#F5F5F2]">Filter</button>
      </form>

      {totalItems > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="grid flex-1 grid-cols-2 gap-3">
            <TrashStat label="Portfolio" value={totals.entry} />
            <TrashStat label="Cases" value={totals.case} />
          </div>
          <EmptyTrashButton
            eligibleCount={eligibleItems.length}
            retainedCount={retainedItems.length}
            nextEligibleAt={nextEligibleAt}
          />
        </div>
      )}

      <div className="flex items-start gap-3 bg-[#141416] border border-white/[0.06] rounded-lg px-4 py-3 mb-6">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-xs text-[rgba(245,245,242,0.4)] leading-relaxed">
          Items stay in Trash for 30 days before permanent deletion is available. Files linked to restored entries remain available.
        </p>
      </div>

      {totalItems === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-[#F5F5F2] mb-1">Nothing in trash</p>
          <p className="max-w-sm text-xs text-[rgba(245,245,242,0.55)]">
            Deleted entries and cases land here for 30 days, then are permanently removed. You can restore anything within that window.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map(item => (
            <TrashRow key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </PullToRefresh>
  )
}

function TrashStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-lg px-4 py-3">
      <p className="text-xs text-[rgba(245,245,242,0.4)] mb-1">{label}</p>
      <p className="text-xl font-semibold text-[#F5F5F2]">{value}</p>
    </div>
  )
}
