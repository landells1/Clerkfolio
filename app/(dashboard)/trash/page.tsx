import { createClient } from '@/lib/supabase/server'
import TrashActions from '@/components/trash/trash-actions'

export default async function TrashPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: deletedEntries }, { data: deletedCases }, { data: deletedLogbookEntries }] = await Promise.all([
    supabase.from('portfolio_entries').select('id, title, category, date, deleted_at')
      .eq('user_id', user!.id).not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
    supabase.from('cases').select('id, title, clinical_domain, date, deleted_at')
      .eq('user_id', user!.id).not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
    supabase.from('logbook_entries').select('id, procedure_name, surgical_specialty, date, deleted_at')
      .eq('user_id', user!.id).not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
  ])

  const totalItems = (deletedEntries?.length ?? 0) + (deletedCases?.length ?? 0) + (deletedLogbookEntries?.length ?? 0)

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Trash</h1>
        <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">
          {totalItems === 0 ? 'Trash is empty' : `${totalItems} deleted ${totalItems === 1 ? 'item' : 'items'}`}
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
          {deletedEntries?.map(entry => (
            <TrashItem key={entry.id} id={entry.id} title={entry.title} subtitle={entry.category?.replace('_', ' ')} date={entry.date} deletedAt={entry.deleted_at} type="entry" />
          ))}
          {deletedCases?.map(c => (
            <TrashItem key={c.id} id={c.id} title={c.title} subtitle={c.clinical_domain ?? 'Case'} date={c.date} deletedAt={c.deleted_at} type="case" />
          ))}
          {deletedLogbookEntries?.map(entry => (
            <TrashItem key={entry.id} id={entry.id} title={entry.procedure_name} subtitle={entry.surgical_specialty} date={entry.date} deletedAt={entry.deleted_at} type="logbook" />
          ))}
        </div>
      )}
    </div>
  )
}

function TrashItem({ id, title, subtitle, date, deletedAt, type }: { id: string; title: string; subtitle: string; date: string; deletedAt: string; type: 'entry' | 'case' | 'logbook' }) {
  const deletedDate = new Date(deletedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <div className="flex items-center gap-3 bg-[#141416] border border-white/[0.08] rounded-xl px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[rgba(245,245,242,0.8)] truncate">{title}</p>
        <p className="text-xs text-[rgba(245,245,242,0.35)] mt-0.5 capitalize">{subtitle} · Deleted {deletedDate}</p>
      </div>
      <TrashActions id={id} type={type} />
    </div>
  )
}
