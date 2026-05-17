import { createClient } from '@/lib/supabase/server'
import { TimelineClient, type TimelineGoal, type TimelineSpecialtyDeadline, type TimelineSpecialty } from '@/components/timeline/timeline-client'
import { NHS_ROUND_3_2026_DEADLINES, getDeadlinesForSpecialty } from '@/lib/specialties/deadlines'
import { formatSpecialtyLabel } from '@/lib/specialties'
import SavedSearchBar from '@/components/search/saved-search-bar'
import { matchesParsedQuery, parseSearchQuery } from '@/lib/search/parser'

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; since?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const q = resolvedSearchParams.q ?? ''
  const parsedQuery = parseSearchQuery([q, resolvedSearchParams.since ? `since:${resolvedSearchParams.since}` : ''].filter(Boolean).join(' '))

  const [{ data: goals }, { data: specialties }, { data: deadlines }, { data: profile }] = await Promise.all([
    supabase
      .from('goals')
      .select('id, category, target_count, due_date, specialty_application_id, specific, measurable, achievable, relevant, time_bound, created_at')
      .eq('user_id', user!.id)
      .is('completed_at', null)
      .order('due_date', { ascending: true }),
    supabase
      .from('specialty_applications')
      .select('id, specialty_key')
      .eq('user_id', user!.id)
      .eq('is_active', true),
    supabase
      .from('deadlines')
      .select('id, title, due_date, details, location, source_specialty_key, is_auto')
      .eq('user_id', user!.id)
      .eq('completed', false)
      .order('due_date', { ascending: true }),
    supabase
      .from('profiles')
      .select('calendar_feed_token_hash')
      .eq('id', user!.id)
      .single(),
  ])

  const specialtyRows: TimelineSpecialty[] = (specialties ?? []).map(row => ({
    id: row.id,
    key: row.specialty_key,
    name: formatSpecialtyLabel(row.specialty_key),
  }))

  const persistedAutoKeys = new Set(
    (deadlines ?? [])
      .filter(deadline => deadline.is_auto && deadline.source_specialty_key)
      .map(deadline => `${deadline.source_specialty_key}|${deadline.title}|${deadline.due_date}`)
  )

  const configuredDeadlines = specialtyRows.flatMap(specialty =>
    getDeadlinesForSpecialty(specialty.key)
      .filter(item => !persistedAutoKeys.has(`${specialty.key}|${item.label}|${item.date}`))
      .map(item => ({
        id: `${specialty.id}-${item.kind}`,
        title: item.label,
        date: item.date,
        details: item.details ?? null,
        location: null,
        sourceUrl: item.sourceUrl,
        sourceLabel: item.sourceLabel,
        specialtyApplicationId: specialty.id,
        specialtyKey: specialty.key,
        specialtyName: specialty.name,
        source: 'config' as const,
      }))
  )

  const manualDeadlines: TimelineSpecialtyDeadline[] = (deadlines ?? []).map(deadline => {
    const specialty = specialtyRows.find(row => row.key === deadline.source_specialty_key)
    return {
      id: deadline.id,
      title: deadline.title,
      date: deadline.due_date,
      details: deadline.details,
      location: deadline.location,
      sourceUrl: deadline.location?.startsWith('http') ? deadline.location : null,
      sourceLabel: deadline.location?.startsWith('http') ? 'Event link' : null,
      specialtyApplicationId: specialty?.id ?? null,
      specialtyKey: deadline.source_specialty_key,
      specialtyName: specialty?.name ?? 'Other',
      source: 'table',
    }
  })

  const hasSpecialtySpecificDeadlines =
    configuredDeadlines.length > 0 || manualDeadlines.some(deadline => deadline.specialtyKey)

  const nationalRecruitmentDeadlines: TimelineSpecialtyDeadline[] = hasSpecialtySpecificDeadlines
    ? []
    : NHS_ROUND_3_2026_DEADLINES.map(item => ({
        id: item.kind,
        title: item.label,
        date: item.date,
        details: item.details ?? null,
        location: null,
        sourceUrl: item.sourceUrl,
        sourceLabel: item.sourceLabel,
        specialtyApplicationId: null,
        specialtyKey: item.specialtyKey,
        specialtyName: 'NHS recruitment',
        source: 'config',
      }))

  const filteredGoals = ((goals ?? []) as TimelineGoal[]).filter(goal => matchesParsedQuery({
    title: goal.specific ?? goal.category,
    notes: [goal.measurable, goal.achievable, goal.relevant, goal.time_bound].filter(Boolean).join(' '),
    date: goal.due_date,
    category: goal.category,
  }, parsedQuery))
  const filteredDeadlines = [...nationalRecruitmentDeadlines, ...configuredDeadlines, ...manualDeadlines].filter(deadline => matchesParsedQuery({
    title: deadline.title,
    notes: deadline.details,
    date: deadline.date,
    category: 'deadline',
  }, parsedQuery))

  // Compute the calendar's initial month once on the server. Passing this in as
  // a stable prop avoids the new Date() / hydration mismatch the client would
  // otherwise hit if the page renders straddling midnight UTC.
  const now = new Date()
  const initialMonthIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()

  return (
    <TimelineClient
      goals={filteredGoals}
      specialties={specialtyRows}
      deadlines={filteredDeadlines}
      calendarFeedExists={Boolean(profile?.calendar_feed_token_hash)}
      initialMonthIso={initialMonthIso}
      filterBar={
        <div className="mb-6">
        <form className="mb-3 flex flex-wrap gap-2">
          <input name="q" defaultValue={q} placeholder="Search timeline" className="min-h-[44px] flex-1 rounded-lg border border-subtle bg-surface-1 px-4 text-sm text-fg placeholder-fg-2 outline-none focus:border-strong" />
          <input type="date" name="since" defaultValue={resolvedSearchParams.since ?? ''} className="min-h-[44px] rounded-lg border border-subtle bg-surface-1 px-3 text-sm text-fg" />
          <button className="min-h-[44px] rounded-lg border border-subtle bg-surface-1 px-4 text-sm font-medium text-fg">Search</button>
        </form>
        <SavedSearchBar surface="timeline" q={q} />
        </div>
      }
    />
  )
}
