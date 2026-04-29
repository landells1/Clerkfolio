import { createClient } from '@/lib/supabase/server'
import { TimelineClient, type TimelineGoal, type TimelineSpecialtyDeadline, type TimelineSpecialty } from '@/components/timeline/timeline-client'
import { NHS_ROUND_3_2026_DEADLINES, getDeadlinesForSpecialty } from '@/lib/specialties/deadlines'
import { getSpecialtyConfig } from '@/lib/specialties'

export default async function TimelinePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: goals }, { data: specialties }, { data: deadlines }, { data: profile }] = await Promise.all([
    supabase
      .from('goals')
      .select('id, category, target_count, due_date, specialty_application_id, created_at')
      .eq('user_id', user!.id)
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
      .select('calendar_feed_token')
      .eq('id', user!.id)
      .single(),
  ])

  const specialtyRows: TimelineSpecialty[] = (specialties ?? []).map(row => ({
    id: row.id,
    key: row.specialty_key,
    name: getSpecialtyConfig(row.specialty_key)?.name ?? row.specialty_key,
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

  const nationalRecruitmentDeadlines: TimelineSpecialtyDeadline[] = NHS_ROUND_3_2026_DEADLINES.map(item => ({
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

  return (
    <TimelineClient
      goals={(goals ?? []) as TimelineGoal[]}
      specialties={specialtyRows}
      deadlines={[...nationalRecruitmentDeadlines, ...configuredDeadlines, ...manualDeadlines]}
      calendarFeedToken={profile?.calendar_feed_token ?? null}
    />
  )
}
