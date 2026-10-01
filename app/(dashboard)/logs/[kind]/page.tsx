import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PersonalLogForm, { type PersonalLogKind } from '@/components/logs/personal-log-form'
import { emptyHeading } from '@/lib/logs/personal-log'
import { rotationEndDate, rotationSpans, type RotationRow } from '@/lib/logs/rotations'
import { daysBetween } from '@/lib/dashboard/date-stats'
import { londonDateKey } from '@/lib/engagement/streaks'
import WbaHeatmap from '@/components/logs/wba-heatmap'
import SavedSearchBar from '@/components/search/saved-search-bar'
import LogList from '@/components/logs/log-list'
import PullToRefresh from '@/components/ui/pull-to-refresh'
import SectionHeader from '@/components/ui/section-header'
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

const EMPTY_COPY: Record<PersonalLogKind, string> = {
  mandatory_training: 'Track mandatory training modules and expiry dates so renewals do not surprise you.',
  course: 'Record courses and CPD hours, including any costs you may want for reimbursement or tax records.',
  exam: 'Log exam attempts, scores, dates, and costs.',
  mentor_meeting: 'Keep a record of mentor, supervisor, and careers meetings.',
  oop: 'Capture out-of-programme plans, tasters, and exploratory experiences.',
  rotation: 'Log each rotation with its start and end date. The dashboard then counts the entries and cases dated inside each one.',
  wba_received: 'A quick tally of the workplace-based assessments you received (CBD, Mini-CEX, DOPS, ACAT, DCT). To write up what you learned from one, add a Reflection entry in your portfolio.',
  teaching_observed: 'Log observed teaching sessions and feedback you received.',
}

type PersonalLogRow = {
  id: string
  title: string
  date: string
  expires_at: string | null
  cpd_hours: number | null
  attempts: number | null
  score: string | null
  cost_pence: number | null
  meta: { detail?: string; end_date?: string; wba_type?: string } | null
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
  if (slug === 'conferences') redirect('/portfolio?category=conference')
  const tab = TABS.find(item => item.slug === slug)
  if (!tab) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [{ data: rows }, { data: rotationRows }] = await Promise.all([
    supabase
      .from('personal_log')
      .select('id, title, date, expires_at, cpd_hours, attempts, score, cost_pence, meta, notes')
      .eq('user_id', user!.id)
      .eq('kind', tab.kind)
      .is('deleted_at', null)
      .order('date', { ascending: false }),
    // The WBA table groups by rotation span, so it needs the rotations too.
    tab.kind === 'wba_received'
      ? supabase
          .from('personal_log')
          .select('id, title, date, meta')
          .eq('user_id', user!.id)
          .eq('kind', 'rotation')
          .is('deleted_at', null)
      : Promise.resolve({ data: [] as RotationRow[] }),
  ])
  const todayKey = londonDateKey(new Date())
  const logRows = ((rows ?? []) as PersonalLogRow[]).filter(row => matchesParsedQuery({
    ...row,
    notes: [row.notes, row.meta?.detail].filter(Boolean).join(' '),
    category: tab.kind,
  }, parsedQuery))
  // "Reflection due" uses the rotation's real END date (it used the start
  // date). Rotations without an end date are ongoing and never prompt.
  const rotationReflectionPrompts = tab.kind === 'rotation'
    ? logRows.filter(row => {
      const end = rotationEndDate({ date: row.date, meta: row.meta })
      if (!end) return false
      const daysFromToday = daysBetween(todayKey, end)
      return daysFromToday >= -14 && daysFromToday <= 14
    }).slice(0, 3)
    : []

  return (
    <PullToRefresh className="max-w-container mx-auto p-6 lg:p-8">
      <SectionHeader
        title="Logs"
        sub="Training, CPD, WBA, meetings, exams, OOP, and rotations."
      />

      <div className="mb-6 flex flex-wrap gap-2 overflow-x-auto sm:overflow-visible">
        {TABS.map(item => (
          <Link key={item.slug} href={`/logs/${item.slug}`} className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${item.slug === slug ? 'bg-surface-3 text-fg' : 'text-fg-2 hover:bg-surface-2 hover:text-fg'}`}>
            {item.label}
          </Link>
        ))}
        <Link href="/portfolio?category=conference" className="rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-fg-2 hover:bg-surface-2 hover:text-fg transition-colors">
          Conferences
        </Link>
      </div>

      <form className="mb-3 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search this log" className="min-h-[44px] flex-1 rounded-lg border border-subtle bg-surface-1 px-4 text-sm text-fg placeholder-fg-2 outline-none focus:border-strong" />
        <input type="date" name="since" defaultValue={resolvedSearchParams?.since ?? ''} className="min-h-[44px] rounded-lg border border-subtle bg-surface-1 px-3 text-sm text-fg" />
        <button className="min-h-[44px] rounded-lg border border-subtle bg-surface-1 px-4 text-sm font-medium text-fg">Search</button>
      </form>
      <SavedSearchBar surface="logs" q={q} />

      {rotationReflectionPrompts.length > 0 && (
        <div className="mb-6 rounded-lg border border-pill-blue bg-pill-blue p-4">
          <h2 className="text-sm font-semibold text-fg">Rotation reflection due</h2>
          <p className="mt-1 text-sm text-fg-1">
            {rotationReflectionPrompts[0].title} is at or near its end date. Capture a brief reflection while the block is still fresh.
          </p>
          <Link href="/portfolio/new?category=reflection" className="mt-3 inline-flex min-h-[40px] items-center rounded-lg bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] px-4 text-sm font-semibold text-[var(--button-primary-text)] transition-colors">
            Add reflection
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <PersonalLogForm kind={tab.kind} />
        <section className="rounded-lg border border-subtle bg-surface-1">
          {logRows.length === 0 ? (
            <div className="p-6">
              <p className="text-sm font-medium text-fg">{emptyHeading(tab.kind)}</p>
              <p className="mt-1 text-sm text-fg-2">{EMPTY_COPY[tab.kind]}</p>
            </div>
          ) : (
            <LogList rows={logRows} kind={tab.kind} todayKey={todayKey} />
          )}
        </section>
      </div>

      {tab.kind === 'wba_received' && (
        <div className="mt-6">
          <WbaHeatmap
            rows={logRows.map(row => ({ title: row.title, date: row.date, meta: row.meta }))}
            rotations={rotationSpans((rotationRows ?? []) as RotationRow[])}
            todayKey={todayKey}
          />
        </div>
      )}
    </PullToRefresh>
  )
}
