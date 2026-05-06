import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PersonalLogForm, { type PersonalLogKind } from '@/components/logs/personal-log-form'
import WbaHeatmap from '@/components/logs/wba-heatmap'
import SavedSearchBar from '@/components/search/saved-search-bar'
import LogList from '@/components/logs/log-list'
import PullToRefresh from '@/components/ui/pull-to-refresh'
import { matchesParsedQuery, parseSearchQuery } from '@/lib/search/parser'

const TABS: { slug: string; kind: PersonalLogKind; label: string }[] = [
  { slug: 'training', kind: 'mandatory_training', label: 'Training' },
  { slug: 'courses', kind: 'course', label: 'Courses' },
  { slug: 'exams', kind: 'exam', label: 'Exams' },
  { slug: 'mentors', kind: 'mentor_meeting', label: 'Mentors' },
  { slug: 'oop', kind: 'oop', label: 'OOP' },
  { slug: 'rotations', kind: 'rotation', label: 'Rotations' },
  { slug: 'wba', kind: 'wba_received', label: 'WBA' },
  { slug: 'observations', kind: 'teaching_observed', label: 'Observations' },
]

type PersonalLogRow = {
  id: string
  title: string
  date: string
  expires_at: string | null
  cpd_hours: number | null
  attempts: number | null
  score: string | null
  cost_pence: number | null
  meta: { detail?: string } | null
  notes: string | null
}

export default async function LogsKindPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>
  searchParams?: Promise<{ q?: string; since?: string }>
}) {
  const { kind: slug } = await params
  const resolvedSearchParams = await searchParams
  const q = resolvedSearchParams?.q ?? ''
  const parsedQuery = parseSearchQuery([q, resolvedSearchParams?.since ? `since:${resolvedSearchParams.since}` : ''].filter(Boolean).join(' '))
  const tab = TABS.find(item => item.slug === slug)
  if (!tab) notFound()

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: rows } = await supabase
    .from('personal_log')
    .select('id, title, date, expires_at, cpd_hours, attempts, score, cost_pence, meta, notes')
    .eq('user_id', user!.id)
    .eq('kind', tab.kind)
    .is('deleted_at', null)
    .order('date', { ascending: false })
  const logRows = ((rows ?? []) as PersonalLogRow[]).filter(row => matchesParsedQuery({
    ...row,
    notes: [row.notes, row.meta?.detail].filter(Boolean).join(' '),
    category: tab.kind,
  }, parsedQuery))
  const rotationReflectionPrompts = tab.kind === 'rotation'
    ? logRows.filter(row => {
      const daysFromToday = Math.ceil((new Date(row.date).getTime() - Date.now()) / 86400000)
      return daysFromToday >= -14 && daysFromToday <= 14
    }).slice(0, 3)
    : []

  return (
    <PullToRefresh className="max-w-5xl p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[#F5F5F2]">Logs</h1>
        <p className="mt-1 text-sm text-[rgba(245,245,242,0.45)]">Training, CPD, WBA, meetings, exams, OOP, and rotations.</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map(item => (
          <Link key={item.slug} href={`/logs/${item.slug}`} className={`rounded-lg px-3 py-2 text-sm font-medium ${item.slug === slug ? 'bg-[#F5F5F2]/10 text-[#F5F5F2]' : 'text-[rgba(245,245,242,0.55)] hover:bg-white/[0.05] hover:text-[#F5F5F2]'}`}>
            {item.label}
          </Link>
        ))}
        <Link href="/portfolio?category=conference" className="rounded-lg px-3 py-2 text-sm font-medium text-[rgba(245,245,242,0.55)] hover:bg-white/[0.05] hover:text-[#F5F5F2]">
          Conferences
        </Link>
      </div>

      <form className="mb-3 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search this log" className="min-h-[44px] flex-1 rounded-xl border border-white/[0.08] bg-[#141416] px-4 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.55)] outline-none focus:border-[#1B6FD9]" />
        <input type="date" name="since" defaultValue={resolvedSearchParams?.since ?? ''} className="min-h-[44px] rounded-xl border border-white/[0.08] bg-[#141416] px-3 text-sm text-[#F5F5F2]" />
        <button className="min-h-[44px] rounded-xl border border-white/[0.08] bg-[#141416] px-4 text-sm font-medium text-[#F5F5F2]">Search</button>
      </form>
      <SavedSearchBar surface="logs" q={q} />

      {rotationReflectionPrompts.length > 0 && (
        <div className="mb-6 rounded-2xl border border-[#1B6FD9]/25 bg-[#1B6FD9]/10 p-4">
          <h2 className="text-sm font-semibold text-[#F5F5F2]">Rotation reflection due</h2>
          <p className="mt-1 text-sm text-[rgba(245,245,242,0.62)]">
            {rotationReflectionPrompts[0].title} is at or near its end date. Capture a brief reflection while the block is still fresh.
          </p>
          <Link href="/portfolio/new?category=reflection" className="mt-3 inline-flex min-h-[40px] items-center rounded-lg bg-[#1B6FD9] px-4 text-sm font-semibold text-[#0B0B0C]">
            Add reflection
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <PersonalLogForm kind={tab.kind} />
        <section className="rounded-2xl border border-white/[0.08] bg-[#141416]">
          {logRows.length === 0 ? (
            <p className="p-6 text-sm text-[rgba(245,245,242,0.45)]">No entries yet.</p>
          ) : (
            <LogList rows={logRows} />
          )}
        </section>
      </div>

      {tab.kind === 'wba_received' && (
        <div className="mt-6">
          <WbaHeatmap rows={logRows.map(row => ({ title: row.title, meta: row.meta }))} />
        </div>
      )}
    </PullToRefresh>
  )
}
