import { createClient } from '@/lib/supabase/server'
import TrashActions from '@/components/trash/trash-actions'
import { CATEGORIES, type Category } from '@/lib/types/portfolio'

type TrashItemType = 'entry' | 'case'

type TrashItem = {
  id: string
  title: string
  subtitle: string
  date: string
  deletedAt: string
  type: TrashItemType
}

export default async function TrashPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: deletedEntries }, { data: deletedCases }] = await Promise.all([
    supabase.from('portfolio_entries').select('id, title, category, date, deleted_at')
      .eq('user_id', user!.id).not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
    supabase.from('cases').select('id, title, clinical_domain, date, deleted_at')
      .eq('user_id', user!.id).not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
  ])

  const items: TrashItem[] = [
    ...(deletedEntries ?? []).map(entry => ({
      id: entry.id,
      title: entry.title,
      subtitle: CATEGORIES.find(c => c.value === entry.category as Category)?.label ?? entry.category?.replace(/_/g, ' ') ?? 'Portfolio entry',
      date: entry.date,
      deletedAt: entry.deleted_at,
      type: 'entry' as const,
    })),
    ...(deletedCases ?? []).map(c => ({
      id: c.id,
      title: c.title,
      subtitle: c.clinical_domain ?? 'Case',
      date: c.date,
      deletedAt: c.deleted_at,
      type: 'case' as const,
    })),
  ].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))

  const totalItems = items.length
  const totals = {
    entry: items.filter(item => item.type === 'entry').length,
    case: items.filter(item => item.type === 'case').length,
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Trash</h1>
        <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">
          {totalItems === 0 ? 'Trash is empty' : `${totalItems} deleted ${totalItems === 1 ? 'item' : 'items'}`}
        </p>
      </div>

      {totalItems > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <TrashStat label="Portfolio" value={totals.entry} />
          <TrashStat label="Cases" value={totals.case} />
        </div>
      )}

      <div className="flex items-start gap-3 bg-[#141416] border border-white/[0.06] rounded-lg px-4 py-3 mb-6">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-xs text-[rgba(245,245,242,0.4)] leading-relaxed">
          Deleted items are soft-deleted and can be restored. Files linked to restored entries remain available.
        </p>
      </div>

      {totalItems === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </div>
          <p className="text-sm text-[rgba(245,245,242,0.4)]">Nothing in trash</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <TrashRow key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
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

function TrashRow({ item }: { item: TrashItem }) {
  const deletedDate = new Date(item.deletedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const entryDate = new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const typeLabel = item.type === 'entry' ? 'Portfolio' : 'Case'
  return (
    <div className="flex items-center gap-3 bg-[#141416] border border-white/[0.08] rounded-lg px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[10px] font-medium text-[rgba(245,245,242,0.5)]">
            {typeLabel}
          </span>
          <p className="text-sm text-[rgba(245,245,242,0.82)] truncate">{item.title}</p>
        </div>
        <p className="text-xs text-[rgba(245,245,242,0.35)] capitalize">
          {item.subtitle} · {entryDate} · Deleted {deletedDate}
        </p>
      </div>
      <TrashActions id={item.id} type={item.type} />
    </div>
  )
}
