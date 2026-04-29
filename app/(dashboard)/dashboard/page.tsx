import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSpecialtyConfig } from '@/lib/specialties'
import type { SpecialtyEntryLink } from '@/lib/specialties'
import ActivityFeed from '@/components/dashboard/activity-feed'
import OnboardingChecklist from '@/components/dashboard/onboarding-checklist'
import CoverageWidget from '@/components/dashboard/coverage-widget'
import QuickAddButton from '@/components/dashboard/quick-add-button'
import ActivityHeatmap from '@/components/dashboard/activity-heatmap'
import StreakBadge from '@/components/dashboard/streak-badge'
import SpecialtyRadar from '@/components/dashboard/specialty-radar'
import UpcomingTimeline from '@/components/dashboard/upcoming-timeline'
import type { PortfolioEntry } from '@/lib/types/portfolio'
import type { Case } from '@/lib/types/cases'

function computeWeeklyStreak(allDates: string[]): number {
  function getWeekStart(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00Z')
    const day = d.getUTCDay()
    const diff = day === 0 ? -6 : 1 - day
    const mon = new Date(d)
    mon.setUTCDate(d.getUTCDate() + diff)
    return mon.toISOString().split('T')[0]
  }

  const weekSet = new Set(allDates.map(getWeekStart))
  const today = new Date().toISOString().split('T')[0]
  let cursor = new Date(today + 'T12:00:00Z')
  let ws = getWeekStart(today)
  if (!weekSet.has(ws)) {
    cursor.setUTCDate(cursor.getUTCDate() - 7)
    ws = getWeekStart(cursor.toISOString().split('T')[0])
  }

  let streak = 0
  while (weekSet.has(ws)) {
    streak++
    cursor.setUTCDate(cursor.getUTCDate() - 7)
    ws = getWeekStart(cursor.toISOString().split('T')[0])
  }
  return streak
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 84)
  const cutoffStr = cutoff.toISOString()
  const today = new Date().toISOString().split('T')[0]
  const in30 = new Date()
  in30.setDate(in30.getDate() + 30)
  const in30Str = in30.toISOString().split('T')[0]

  const [
    { data: profile },
    { data: trackedSpecialtyRows },
    { data: recentEntries },
    { data: recentCases },
    { data: allEntries },
    { data: allCases },
    { data: deadlines },
    { data: goals },
    { data: recentPortfolioForHeatmap },
    { data: recentCasesForHeatmap },
    { data: allPortfolioDates },
    { data: allCaseDates },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, career_stage, onboarding_checklist_dismissed, onboarding_checklist_completed_items')
      .eq('id', user!.id)
      .single(),
    supabase
      .from('specialty_applications')
      .select('id, specialty_key, bonus_claimed')
      .eq('user_id', user!.id),
    supabase
      .from('portfolio_entries')
      .select('*')
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('cases')
      .select('*')
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('portfolio_entries')
      .select('id, category, specialty_tags, created_at, date')
      .eq('user_id', user!.id)
      .is('deleted_at', null),
    supabase
      .from('cases')
      .select('specialty_tags, clinical_domain, clinical_domains, created_at, date')
      .eq('user_id', user!.id)
      .is('deleted_at', null),
    supabase
      .from('deadlines')
      .select('id, title, due_date')
      .eq('user_id', user!.id)
      .eq('completed', false)
      .gte('due_date', today)
      .lte('due_date', in30Str)
      .order('due_date', { ascending: true })
      .limit(10),
    supabase
      .from('goals')
      .select('category, target_count, due_date')
      .eq('user_id', user!.id)
      .gte('due_date', today)
      .lte('due_date', in30Str)
      .order('due_date', { ascending: true })
      .limit(10),
    supabase
      .from('portfolio_entries')
      .select('created_at')
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .gte('created_at', cutoffStr),
    supabase
      .from('cases')
      .select('created_at')
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .gte('created_at', cutoffStr),
    supabase
      .from('portfolio_entries')
      .select('date')
      .eq('user_id', user!.id)
      .is('deleted_at', null),
    supabase
      .from('cases')
      .select('date')
      .eq('user_id', user!.id)
      .is('deleted_at', null),
  ])

  const applicationIds = (trackedSpecialtyRows ?? []).map(r => r.id)
  const { data: specialtyLinksRaw } = applicationIds.length > 0
    ? await supabase.from('specialty_entry_links').select('*').in('application_id', applicationIds)
    : { data: [] as SpecialtyEntryLink[] }
  const specialtyLinks = (specialtyLinksRaw ?? []) as SpecialtyEntryLink[]

  const coverageCounts = Object.entries(
    (allEntries ?? []).reduce((acc: Record<string, number>, entry) => {
      acc[entry.category] = (acc[entry.category] ?? 0) + 1
      return acc
    }, {})
  ).map(([category, count]) => ({ category, count }))

  const clinicalAreaCounts: Record<string, number> = {}
  allCases?.forEach(c => {
    const domains: string[] = (c as { clinical_domains?: string[] }).clinical_domains?.length
      ? (c as { clinical_domains: string[] }).clinical_domains
      : c.clinical_domain ? [c.clinical_domain] : []
    domains.forEach(domain => { clinicalAreaCounts[domain] = (clinicalAreaCounts[domain] ?? 0) + 1 })
  })

  const heatmapDates = [
    ...(recentPortfolioForHeatmap ?? []).map((e: { created_at: string }) => e.created_at.split('T')[0]),
    ...(recentCasesForHeatmap ?? []).map((e: { created_at: string }) => e.created_at.split('T')[0]),
  ]
  const streakDates = [
    ...(allPortfolioDates ?? []).map((e: { date: string }) => e.date).filter(Boolean),
    ...(allCaseDates ?? []).map((e: { date: string }) => e.date).filter(Boolean),
  ]

  const upcomingItems = [
    ...(deadlines ?? []).map(d => ({ id: d.id, title: d.title, date: d.due_date, type: 'Deadline' as const })),
    ...(goals ?? []).filter(g => g.due_date).map(g => ({ id: `${g.category}-${g.due_date}`, title: `${g.target_count} ${g.category.replace(/_/g, ' ')}`, date: g.due_date, type: 'Goal' as const })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5)

  const specialtyProgressRows = (trackedSpecialtyRows ?? []).map(row => {
    const config = getSpecialtyConfig(row.specialty_key)
    const links = specialtyLinks.filter(link => link.application_id === row.id)
    const evidenced = new Set(links.map(link => link.domain_key)).size
    const total = config?.domains.length ?? 0
    return {
      id: row.id,
      label: config?.name ?? row.specialty_key,
      percent: total === 0 ? 0 : Math.round((evidenced / total) * 100),
      entryCount: new Set(links.map(link => link.entry_id)).size,
    }
  })

  const specialtyScores = specialtyProgressRows.map(row => ({
    key: row.id,
    label: row.label,
    isEvidenceBased: true,
    score: 0,
    maxScore: 0,
    essentialsMet: row.entryCount,
    essentialsTotal: row.entryCount,
    desirablesEvidenced: 0,
    desirablesTotal: 0,
  }))

  const trackedSpecialtyKeys = (trackedSpecialtyRows ?? []).map(r => r.specialty_key)
  const entryVolume = buildEntryVolume(allEntries ?? [])

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Dashboard</h1>
          <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">
            {profile?.career_stage ? `${profile.career_stage} - ` : ''}Your collated portfolio data
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-4 shrink-0">
          <StreakBadge streak={computeWeeklyStreak(streakDates)} />
          <QuickAddButton userInterests={trackedSpecialtyKeys} />
        </div>
      </div>

      {profile && !profile.onboarding_checklist_dismissed && (
        <OnboardingChecklist
          userId={user!.id}
          completedItems={(profile as { onboarding_checklist_completed_items?: string[] }).onboarding_checklist_completed_items ?? []}
          accountCreatedAt={user!.created_at}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 mb-6">
        <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5">
          <p className="text-xs text-[rgba(245,245,242,0.4)] mb-3">Quick add</p>
          <QuickAddButton userInterests={trackedSpecialtyKeys} />
        </div>
        <UpcomingTimeline items={upcomingItems} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard label="Portfolio entries" value={allEntries?.length ?? 0} href="/portfolio" />
        <StatCard label="Cases logged" value={allCases?.length ?? 0} href="/cases" />
        <StatCard label="Timeline items" value={upcomingItems.length} href="/timeline" />
      </div>

      <div className="space-y-5">
        <DashboardSection title="Activity" defaultOpen>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
            <ActivityHeatmap dates={heatmapDates} />
            <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5">
              <p className="text-xs text-[rgba(245,245,242,0.4)] mb-3">Current streak</p>
              <StreakBadge streak={computeWeeklyStreak(streakDates)} />
            </div>
          </div>
        </DashboardSection>

        <DashboardSection title="Portfolio" defaultOpen>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CoverageWidget counts={coverageCounts} />
            <EntryVolumeChart data={entryVolume} />
          </div>
        </DashboardSection>

        <DashboardSection title="Specialty progress" defaultOpen>
          <SpecialtyProgress rows={specialtyProgressRows} />
        </DashboardSection>

        <DashboardSection title="Recent activity">
          <ActivityFeed
            entries={(recentEntries ?? []) as PortfolioEntry[]}
            cases={(recentCases ?? []) as Case[]}
            specialtyScores={specialtyScores}
          />
        </DashboardSection>

        <DashboardSection title="Clinical areas">
          <SpecialtyRadar counts={clinicalAreaCounts} fullWidth />
        </DashboardSection>
      </div>
    </div>
  )
}

function buildEntryVolume(entries: { created_at: string }[]) {
  const now = new Date()
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return { key, label: date.toLocaleDateString('en-GB', { month: 'short' }), count: 0 }
  })
  const byKey = Object.fromEntries(months.map(month => [month.key, month]))
  entries.forEach(entry => {
    const d = new Date(entry.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (byKey[key]) byKey[key].count += 1
  })
  return months
}

function DashboardSection({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <details className="group" open={defaultOpen}>
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between rounded-xl bg-[#141416] border border-white/[0.08] px-4 py-3 text-sm font-semibold text-[#F5F5F2]">
        {title}
        <span className="text-[rgba(245,245,242,0.35)] group-open:rotate-90 transition-transform">&gt;</span>
      </summary>
      <div className="pt-4">{children}</div>
    </details>
  )
}

function EntryVolumeChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map(item => item.count))
  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5">
      <p className="text-sm font-semibold text-[#F5F5F2] mb-4">Entry volume over time</p>
      <div className="flex items-end gap-2 h-44">
        {data.map(item => (
          <div key={item.label} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full rounded-t bg-[#1B6FD9]" style={{ height: `${Math.max(6, (item.count / max) * 140)}px` }} />
            <span className="text-[10px] text-[rgba(245,245,242,0.35)]">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SpecialtyProgress({ rows }: { rows: { id: string; label: string; percent: number; entryCount: number }[] }) {
  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl divide-y divide-white/[0.06]">
      {rows.length === 0 ? (
        <p className="p-5 text-sm text-[rgba(245,245,242,0.35)]">No tracked specialties.</p>
      ) : rows.map(row => (
        <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[1fr_160px_90px] gap-3 p-4 items-center">
          <p className="text-sm font-medium text-[#F5F5F2]">{row.label}</p>
          <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
            <div className="h-full bg-[#1B6FD9]" style={{ width: `${row.percent}%` }} />
          </div>
          <p className="text-xs text-[rgba(245,245,242,0.45)] sm:text-right">{row.percent}% / {row.entryCount} entries</p>
        </div>
      ))}
    </div>
  )
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="bg-[#141416] border border-white/[0.08] rounded-2xl p-4 hover:border-white/[0.14] transition-colors block">
      <p className="text-xs text-[rgba(245,245,242,0.4)] mb-3">{label}</p>
      <p className="font-bold leading-none text-[#F5F5F2]" style={{ fontSize: 32 }}>{value}</p>
    </Link>
  )
}
