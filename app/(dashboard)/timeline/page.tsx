import { createClient } from '@/lib/supabase/server'
import { TimelineClient, type TimelineGoal, type TimelineSpecialtyDeadline, type TimelineSpecialty } from '@/components/timeline/timeline-client'
import { getDeadlinesForSpecialty } from '@/lib/specialties/deadlines'
import { getSpecialtyConfig } from '@/lib/specialties'

export default async function TimelinePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: goals }, { data: specialties }, { data: deadlines }] = await Promise.all([
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
      .select('id, title, due_date, source_specialty_key, is_auto')
      .eq('user_id', user!.id)
      .eq('completed', false)
      .order('due_date', { ascending: true }),
  ])

  const specialtyRows: TimelineSpecialty[] = (specialties ?? []).map(row => ({
    id: row.id,
    key: row.specialty_key,
    name: getSpecialtyConfig(row.specialty_key)?.name ?? row.specialty_key,
  }))

  const configuredDeadlines = specialtyRows.flatMap(specialty =>
    getDeadlinesForSpecialty(specialty.key).map(item => ({
      id: `${specialty.id}-${item.kind}`,
      title: item.label,
      date: item.date,
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
      deadlines={[...configuredDeadlines, ...manualDeadlines]}
    />
  )
}
