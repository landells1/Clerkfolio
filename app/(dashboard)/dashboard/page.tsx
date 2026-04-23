import { createClient } from '@/lib/supabase/server'
import ActivityFeed from '@/components/dashboard/activity-feed'
import DeadlinesWidget from '@/components/dashboard/deadlines-widget'
import CoverageWidget from '@/components/dashboard/coverage-widget'
import QuickAddButton from '@/components/dashboard/quick-add-button'
import ActivityHeatmap from '@/components/dashboard/activity-heatmap'
import StreakBadge from '@/components/dashboard/streak-badge'
import SpecialtyRadar from '@/components/dashboard/specialty-radar'
import type { PortfolioEntry } from '@/lib/types/portfolio'
import type { Case } from '@/lib/types/cases'

function computeWeeklyStreak(allDates: string[]): number {
  function getWeekStart(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00Z')
    const day = d.getUTCDay() // 0=Sun
    const diff = day === 0 ? -6 : 1 - day // shift to Monday
    const mon = new Date(d)
    mon.setUTCDate(d.getUTCDate() + diff)
    return mon.toISOString().split('T')[0]
  }

  const weekSet = new Set(allDates.map(getWeekStart))
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  let streak = 0
  let cursor = new Date(todayStr + 'T12:00:00Z')

  // Start checking from current week; if current week is empty, start from last week
  let ws = getWeekStart(todayStr)
  if (!weekSet.has(ws)) {
    cursor.setUTCDate(cursor.getUTCDate() - 7)
    ws = getWeekStart(cursor.toISOString().split('T')[0])
  }

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

  // Cutoff for heatmap: last 84 days
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 84)
  const cutoffStr = cutoff.toISOString()

  const [
    { data: profile },
    { data: recentEntries },
    { data: recentCases },
    { data: allEntries },
    { data: deadlines },
    { data: allCases },
    { data: recentPortfolioForHeatmap },
    { data: recentCasesForHeatmap },
    { data: allPortfolioDates },
    { data: allCaseDates },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, career_stage, specialty_interests')
      .eq('id', user!.id)
      .single(),
    supabase
      .from('portfolio_entries')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('cases')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('portfolio_entries')
      .select('category, specialty_tags')
      .eq('user_id', user!.id),
    supabase
      .from('deadlines')
      .select('*')
      .eq('user_id', user!.id)
      .gte('due_date', new Date().toISOString().split('T')[0])
      .order('due_date', { ascending: true })
      .limit(20),
    supabase
      .from('cases')
      .select('specialty_tags')
      .eq('user_id', user!.id),
    supabase
      .from('portfolio_entries')
      .select('created_at')
      .eq('user_id', user!.id)
      .gte('created_at', cutoffStr),
    supabase
      .from('cases')
      .select('created_at')
      .eq('user_id', user!.id)
      .gte('created_at', cutoffStr),
    supabase
      .from('portfolio_entries')
      .select('date')
      .eq('user_id', user!.id),
    supabase
      .from('cases')
      .select('date')
      .eq('user_id', user!.id),
  ])

  const firstName = profile?.first_name ?? 'there'

  // Coverage counts per category
  const catMap: Record<string, number> = {}
  allEntries?.forEach(e => { catMap[e.category] = (catMap[e.category] ?? 0) + 1 })
  const coverageCounts = Object.entries(catMap).map(([category, count]) => ({ category, count }))

  // Total stats
  const totalEntries = allEntries?.length ?? 0
  const totalCases = allCases?.length ?? 0
  const totalDeadlines = deadlines?.length ?? 0

  // Specialty tag counts across ALL entries + cases (not the limited feed subset)
  const specialtyCounts: Record<string, number> = {}
  allEntries?.forEach(e => {
    e.specialty_tags?.forEach((t: string) => {
      specialtyCounts[t] = (specialtyCounts[t] ?? 0) + 1
    })
  })
  allCases?.forEach(c => {
    c.specialty_tags?.forEach((t: string) => {
      specialtyCounts[t] = (specialtyCounts[t] ?? 0) + 1
    })
  })

  const specialtyInterests: string[] = profile?.specialty_interests ?? []

  // Heatmap dates (last 84 days, from created_at)
  const heatmapDates = [
    ...(recentPortfolioForHeatmap ?? []).map((e: { created_at: string }) => e.created_at.split('T')[0]),
    ...(recentCasesForHeatmap ?? []).map((e: { created_at: string }) => e.created_at.split('T')[0]),
  ]

  // Streak dates (all time, from date field)
  const streakDates = [
    ...(allPortfolioDates ?? []).map((e: { date: string }) => e.date).filter(Boolean),
    ...(allCaseDates ?? []).map((e: { date: string }) => e.date).filter(Boolean),
  ]
  const streak = computeWeeklyStreak(streakDates)

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">
            Good {greeting()}, {firstName}
          </h1>
          <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">
            {profile?.career_stage ? `${stageLabel(profile.career_stage)} · ` : ''}Here&apos;s your portfolio at a glance
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <StreakBadge streak={streak} />
          <QuickAddButton userInterests={specialtyInterests} />
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Portfolio entries" value={totalEntries} href="/portfolio" icon={<PortfolioIcon />} />
        <StatCard label="Cases logged" value={totalCases} href="/cases" icon={<CaseIcon />} />
        <StatCard label="Upcoming deadlines" value={totalDeadlines} href="#deadlines" icon={<DeadlineIcon />} highlight={totalDeadlines > 0} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Left — Activity feed */}
        <ActivityFeed
          entries={(recentEntries ?? []) as PortfolioEntry[]}
          cases={(recentCases ?? []) as Case[]}
          specialtyInterests={specialtyInterests}
          specialtyCounts={specialtyCounts}
        />

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <div id="deadlines">
            <DeadlinesWidget initialDeadlines={deadlines ?? []} />
          </div>
          <CoverageWidget counts={coverageCounts} />
          <SpecialtyRadar counts={specialtyCounts} />
        </div>
      </div>

      {/* Activity heatmap — full width */}
      <div className="mt-6">
        <ActivityHeatmap dates={heatmapDates} />
      </div>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

function stageLabel(stage: string) {
  const map: Record<string, string> = {
    'Y1-2': 'Year 1–2',
    'Y3-4': 'Year 3–4',
    'Y5-6': 'Year 5–6',
    'FY1':  'FY1',
    'FY2':  'FY2',
  }
  return map[stage] ?? stage
}

function StatCard({
  label,
  value,
  href,
  icon,
  highlight = false,
}: {
  label: string
  value: number
  href: string
  icon: React.ReactNode
  highlight?: boolean
}) {
  return (
    <a
      href={href}
      className="bg-[#141416] border border-white/[0.08] rounded-2xl p-4 hover:border-white/[0.14] transition-colors group block"
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`transition-colors ${highlight && value > 0 ? 'text-amber-400' : 'text-[rgba(245,245,242,0.4)] group-hover:text-[rgba(245,245,242,0.6)]'}`}>
          {icon}
        </span>
      </div>
      <p className={`text-3xl font-bold tracking-tight mb-0.5 ${highlight && value > 0 ? 'text-amber-400' : 'text-[#F5F5F2]'}`}>
        {value}
      </p>
      <p className="text-xs text-[rgba(245,245,242,0.4)]">{label}</p>
    </a>
  )
}

function PortfolioIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  )
}

function CaseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  )
}

function DeadlineIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
