import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { INTERVIEW_THEMES } from '@/lib/constants/interview-themes'
import { CATEGORY_COLOURS, CATEGORIES } from '@/lib/types/portfolio'
import { relativeDate } from '@/lib/utils/dates'

export default async function InterviewPrepPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: entries }, { data: cases }] = await Promise.all([
    supabase
      .from('portfolio_entries')
      .select('id, title, category, date, interview_themes')
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .not('interview_themes', 'eq', '{}'),
    supabase
      .from('cases')
      .select('id, title, date, interview_themes')
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .not('interview_themes', 'eq', '{}'),
  ])

  type EntryRow = { id: string; title: string; category: string; date: string; interview_themes: string[]; source: 'portfolio' }
  type CaseRow = { id: string; title: string; date: string; interview_themes: string[]; source: 'case' }
  type AnyRow = EntryRow | CaseRow

  const allItems: AnyRow[] = [
    ...(entries ?? []).map(e => ({ ...e, source: 'portfolio' as const })),
    ...(cases ?? []).map(c => ({ ...c, category: undefined, source: 'case' as const })),
  ]

  // Build theme → items map
  const themeMap: Record<string, AnyRow[]> = {}
  INTERVIEW_THEMES.forEach(t => { themeMap[t] = [] })
  allItems.forEach(item => {
    item.interview_themes?.forEach(t => {
      if (themeMap[t]) themeMap[t].push(item)
    })
  })

  const totalTagged = allItems.length

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Interview Prep</h1>
        <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">
          Your entries and cases grouped by interview theme.
          {totalTagged === 0
            ? ' Tag entries from any portfolio entry or case to see them here.'
            : ` ${totalTagged} item${totalTagged !== 1 ? 's' : ''} tagged across ${INTERVIEW_THEMES.filter(t => themeMap[t].length > 0).length} themes.`
          }
        </p>
      </div>

      {totalTagged === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </div>
          <p className="text-sm text-[rgba(245,245,242,0.5)] mb-1">No entries tagged yet</p>
          <p className="text-xs text-[rgba(245,245,242,0.3)] mb-6 max-w-sm">
            Open any portfolio entry or case, expand the &quot;Interview themes&quot; section, and tag it with one or more themes.
          </p>
          <Link
            href="/portfolio"
            className="flex items-center gap-2 bg-[#1B6FD9] hover:bg-[#155BB0] text-[#0B0B0C] font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors"
          >
            Go to Portfolio
          </Link>
        </div>
      )}

      {totalTagged > 0 && (
        <div className="space-y-6">
          {INTERVIEW_THEMES.map(theme => {
            const items = themeMap[theme]
            return (
              <div key={theme} className="bg-[#141416] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-[#F5F5F2]">{theme}</h2>
                    <span className="text-xs text-[rgba(245,245,242,0.35)] bg-white/[0.05] px-2 py-0.5 rounded-full">
                      {items.length}
                    </span>
                  </div>
                </div>

                {items.length === 0 ? (
                  <p className="px-5 py-4 text-xs text-[rgba(245,245,242,0.3)]">
                    No entries tagged with {theme} yet — tag entries from any portfolio entry or case.
                  </p>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {items.map(item => {
                      const isPortfolio = item.source === 'portfolio'
                      const catMeta = isPortfolio ? CATEGORIES.find(c => c.value === (item as EntryRow).category) : null
                      const colours = isPortfolio ? CATEGORY_COLOURS[(item as EntryRow).category as keyof typeof CATEGORY_COLOURS] : null

                      return (
                        <Link
                          key={`${item.source}-${item.id}`}
                          href={isPortfolio ? `/portfolio/${item.id}` : `/cases/${item.id}`}
                          className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              {isPortfolio && catMeta && colours ? (
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${colours.badge}`}>
                                  {catMeta.short}
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                                  Case
                                </span>
                              )}
                              <span className="text-sm text-[rgba(245,245,242,0.85)] truncate group-hover:text-[#F5F5F2] transition-colors">
                                {item.title}
                              </span>
                            </div>
                          </div>
                          <span className="shrink-0 text-xs text-[rgba(245,245,242,0.35)] font-mono">{relativeDate(item.date)}</span>
                          <svg className="w-4 h-4 text-[rgba(245,245,242,0.2)] group-hover:text-[rgba(245,245,242,0.5)] transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
