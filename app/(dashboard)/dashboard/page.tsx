import { createClient } from '@/lib/supabase/server'
import { getSpecialtyConfig, calculateTotalScore, isEvidenceBased, getEvidenceProgress } from '@/lib/specialties'
import type { SpecialtyEntryLink } from '@/lib/specialties'
import ActivityFeed from '@/components/dashboard/activity-feed'
import OnboardingChecklist from '@/components/dashboard/onboarding-checklist'
import CoverageWidget from '@/components/dashboard/coverage-widget'
import QuickAddButton from '@/components/dashboard/quick-add-button'
import ActivityHeatmap from '@/components/dashboard/activity-heatmap'
import StreakBadge from '@/components/dashboard/streak-badge'
import SpecialtyRadar from '@/components/dashboard/specialty-radar'
import UpcomingTimeline from '@/components/dashboard/upcoming-timeline'
import EmptyDayPrompt from '@/components/dashboard/empty-day-prompt'
import AnniversaryBanner from '@/components/dashboard/anniversary-banner'
import ResumeDraftsCard from '@/components/dashboard/resume-drafts-card'
import EntriesOverTime, { type EntriesOverTimeBucket } from '@/components/dashboard/entries-over-time'
import TimeSinceCard, { buildTimeSinceRows } from '@/components/dashboard/time-since-card'
import CalendarWidget, { type CalendarWidgetItem } from '@/components/dashboard/calendar-widget'
import CareerTimeline from '@/components/dashboard/career-timeline'
import RotationSummaryCards from '@/components/logs/rotation-summary-cards'
import DashboardSection from '@/components/dashboard/dashboard-section'
import NewAccountQuickStart from '@/components/dashboard/new-account-quick-start'
import ChangelogModal from '@/components/dashboard/changelog-modal'
import DemoStarterCard from '@/components/dashboard/demo-starter-card'
import CareerWelcomeCard from '@/components/dashboard/career-welcome-card'
import GuidedTour from '@/components/dashboard/guided-tour'
import PullToRefresh from '@/components/ui/pull-to-refresh'
import SectionHeader from '@/components/ui/section-header'
import StatTile from '@/components/ui/stat-tile'
import ApplicationModeBanner from '@/components/dashboard/application-mode-banner'
import { formatSpecialtyLabel } from '@/lib/specialties'
import { londonDateKey } from '@/lib/engagement/streaks'
import { CHANGELOG } from '@/lib/changelog'
import { ensureDemoStarterPack } from '@/lib/onboarding/demo-seed'
import { CATEGORIES, type Category, type PortfolioEntry } from '@/lib/types/portfolio'
import type { Case } from '@/lib/types/cases'

const CAREER_STAGE_LABELS: Record<string, string> = {
  Y1:       'Year 1 (Medical Student)',
  Y2:       'Year 2 (Medical Student)',
  Y3:       'Year 3 (Medical Student)',
  Y4:       'Year 4 (Medical Student)',
  Y5_PLUS:  'Year 5+ (Medical Student)',
  FY1:      'Foundation Year 1',
  FY2:      'Foundation Year 2',
  POST_FY:  'Core / Specialty Training',
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 364) // 52 weeks to match heatmap window
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
    { data: rotations },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, career_stage, created_at, last_anniversary_seen_year, streak_cache, onboarding_checklist_dismissed, onboarding_checklist_completed_items, changelog_seen_at, guided_tour_step, demo_dismissed_at')
      .eq('id', user!.id)
      .single(),
    supabase
      .from('specialty_applications')
      .select('id, specialty_key, bonus_claimed, is_target')
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
      .is('completed_at', null)
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
      .from('personal_log')
      .select('id, title, date, meta')
      .eq('user_id', user!.id)
      .eq('kind', 'rotation')
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(8),
  ])
  const seededDemos = await ensureDemoStarterPack(supabase, user!.id, profile?.demo_dismissed_at)
  const changelogEntries = CHANGELOG.filter(entry => !profile?.changelog_seen_at || new Date(entry.date).getTime() > new Date(profile.changelog_seen_at).getTime())

  const applicationIds = (trackedSpecialtyRows ?? []).map(r => r.id)
  const { data: specialtyLinksRaw } = applicationIds.length > 0
    ? await supabase.from('specialty_entry_links').select('*').in('application_id', applicationIds)
    : { data: [] as SpecialtyEntryLink[] }
  // Filter out links whose portfolio entry has since been deleted - allEntries already
  // excludes soft-deleted rows so this catches orphaned links from deleted entries.
  const activeEntryIds = new Set((allEntries ?? []).map(e => e.id))
  const specialtyLinks = (specialtyLinksRaw ?? []).filter(
    link => activeEntryIds.has(link.entry_id)
  ) as SpecialtyEntryLink[]

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
  const activeWeeks = ((profile?.streak_cache as { active_weeks?: string[] } | null)?.active_weeks ?? [])
  const todayLondon = londonDateKey(new Date())
  const hasEntryToday = [
    ...(recentPortfolioForHeatmap ?? []).map((e: { created_at: string }) => e.created_at),
    ...(recentCasesForHeatmap ?? []).map((e: { created_at: string }) => e.created_at),
  ].some(createdAt => londonDateKey(createdAt) === todayLondon)
  const anniversaryYear = profile?.created_at
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (365 * 24 * 60 * 60 * 1000))
    : 0
  const showAnniversary = anniversaryYear > (profile?.last_anniversary_seen_year ?? 0)

  const upcomingItems = [
    ...(deadlines ?? []).map(d => ({ id: d.id, title: d.title, date: d.due_date, type: 'Deadline' as const })),
    ...(goals ?? []).filter(g => g.due_date).map(g => ({ id: `${g.category}-${g.due_date}`, title: `${g.target_count} ${CATEGORIES.find(category => category.value === g.category)?.label ?? g.category}`, date: g.due_date, type: 'Goal' as const })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5)

  // Specialty progress rows: for points-based specialties (e.g. IMT 11/30) we
  // surface the actual points and totalMax via the same calculateTotalScore the
  // tracker uses. For evidence-based specialties (no points - person spec only)
  // we fall back to "essentials met" out of total essentials.
  const specialtyProgressRows = (trackedSpecialtyRows ?? []).map(row => {
    const config = getSpecialtyConfig(row.specialty_key)
    const links = specialtyLinks.filter(link => link.application_id === row.id)
    const entryCount = new Set(links.map(link => link.entry_id)).size
    if (!config) {
      return { id: row.id, label: row.specialty_key, percent: 0, entryCount, scoreLabel: '0' }
    }
    if (isEvidenceBased(config)) {
      const progress = getEvidenceProgress(config, links)
      const denom = progress.essentialsTotal + progress.desirablesTotal
      const numer = progress.essentialsMet + progress.desirablesEvidenced
      return {
        id: row.id,
        label: config.name,
        percent: denom === 0 ? 0 : Math.round((numer / denom) * 100),
        entryCount,
        scoreLabel: `${numer}/${denom} criteria`,
      }
    }
    const score = calculateTotalScore(config, { ...row, user_id: user!.id, cycle_year: config.cycleYear, created_at: '', is_active: true, archived_at: null }, links)
    const max = config.totalMax
    return {
      id: row.id,
      label: config.name,
      percent: max === 0 ? 0 : Math.round((score / max) * 100),
      entryCount,
      scoreLabel: `${score}/${max} pts`,
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

  // Application mode: if any tracked specialty is flagged as the target, surface
  // a deadline countdown banner. Pulls the next upcoming deadline from the
  // existing `deadlines` table sourced from that specialty's auto-loaded
  // deadlines (no new tables needed).
  const targetApp = (trackedSpecialtyRows ?? []).find(row => (row as { is_target?: boolean }).is_target)
  let targetDeadline: string | null = null
  if (targetApp) {
    const { data: targetDeadlines } = await supabase
      .from('deadlines')
      .select('due_date')
      .eq('user_id', user!.id)
      .eq('source_specialty_key', targetApp.specialty_key)
      .eq('completed', false)
      .gte('due_date', today)
      .order('due_date', { ascending: true })
      .limit(1)
    targetDeadline = targetDeadlines?.[0]?.due_date ?? null
  }
  const entriesOverTime = buildEntriesOverTime(allEntries ?? [], allCases ?? [])
  const timeSinceRows = buildTimeSinceRows((allEntries ?? []) as { category: Category; created_at: string }[], (allCases ?? []) as { created_at: string }[])
  const calendarItems: CalendarWidgetItem[] = [
    ...(allEntries ?? []).map(entry => ({ date: entry.date, type: 'entry' as const })),
    ...(allCases ?? []).map(c => ({ date: c.date, type: 'case' as const })),
    ...(deadlines ?? []).map(deadline => ({ date: deadline.due_date, type: 'deadline' as const, title: deadline.title })),
  ]

  return (
    <PullToRefresh className="p-6 lg:p-8 max-w-container mx-auto w-full">
      <SectionHeader
        title="Dashboard"
        sub={profile?.career_stage ? CAREER_STAGE_LABELS[profile.career_stage] ?? profile.career_stage : undefined}
        actions={
          <div className="hidden sm:flex items-center gap-3">
            <StreakBadge activeWeeks={activeWeeks} />
            <QuickAddButton userInterests={trackedSpecialtyKeys} />
          </div>
        }
      />
      <div className="mb-6 sm:hidden">
        <QuickAddButton userInterests={trackedSpecialtyKeys} />
      </div>

      {targetApp && (
        <ApplicationModeBanner
          applicationId={targetApp.id}
          specialtyLabel={formatSpecialtyLabel(targetApp.specialty_key)}
          deadline={targetDeadline}
        />
      )}

      {showAnniversary && (
        <AnniversaryBanner userId={user!.id} year={anniversaryYear} />
      )}
      <ChangelogModal userId={user!.id} entries={changelogEntries} />
      <GuidedTour userId={user!.id} initialStep={profile?.guided_tour_step ?? 0} />
      <CareerWelcomeCard stage={profile?.career_stage} />
      <DemoStarterCard show={seededDemos} />

      {profile && !profile.onboarding_checklist_dismissed && (
        <OnboardingChecklist
          userId={user!.id}
          completedItems={(profile as { onboarding_checklist_completed_items?: string[] }).onboarding_checklist_completed_items ?? []}
          accountCreatedAt={user!.created_at}
          autoCompleted={[
            (allEntries?.length ?? 0) > 0 ? 'portfolio_entry' : null,
            (allCases?.length ?? 0) > 0 ? 'case' : null,
            (trackedSpecialtyRows ?? []).length > 0 ? 'specialty' : null,
            (deadlines?.length ?? 0) > 0 || (goals?.length ?? 0) > 0 ? 'deadline' : null,
          ].filter((value): value is string => Boolean(value))}
        />
      )}

      {!hasEntryToday && <EmptyDayPrompt />}

      {/* New-account quick-start: show until the user has logged 3 entries / 3 cases. */}
      {(() => {
        const portfolioCount = allEntries?.length ?? 0
        const caseCount = allCases?.length ?? 0
        const isNew = portfolioCount < 3 && caseCount < 3
        if (!isNew) return null
        return (
          <NewAccountQuickStart
            hasFirstPortfolio={portfolioCount > 0}
            hasFirstCase={caseCount > 0}
            hasTrackedSpecialty={(trackedSpecialtyRows ?? []).length > 0}
          />
        )
      })()}

      {/* Two-column layout on wide screens: main content left, widgets right */}
      <div className="xl:grid xl:grid-cols-[1fr_300px] xl:gap-6 xl:items-start">

        {/* Main content column */}
        <div className="space-y-5 min-w-0">
          <ActivityHeatmap dates={heatmapDates} />

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <StatTile
              label="Portfolio entries"
              value={allEntries?.length ?? 0}
              sub="across all categories"
              barColour="violet"
            />
            <StatTile
              label="Cases logged"
              value={allCases?.length ?? 0}
              sub="anonymised diary entries"
              barColour="blue"
            />
            <StatTile
              label="Upcoming"
              value={upcomingItems.length}
              sub="deadlines and goals (30d)"
              barColour="amber"
            />
          </div>

          {/* Charts only render once the user has logged something - empty months are noise. */}
          {((allEntries?.length ?? 0) > 0 || (allCases?.length ?? 0) > 0) && (
            <DashboardSection title="Trends" subtitle="entries logged per month" defaultOpen>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <EntriesOverTime data={entriesOverTime} />
                <TimeSinceCard rows={timeSinceRows} />
              </div>
            </DashboardSection>
          )}

          {(allEntries?.length ?? 0) > 0 && (
            <DashboardSection title="Portfolio" subtitle="evidence by category" defaultOpen>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CoverageWidget counts={coverageCounts} />
                <CareerTimeline stage={profile?.career_stage} />
              </div>
            </DashboardSection>
          )}

          {(rotations ?? []).length > 0 && (
            <DashboardSection title="Rotations" defaultOpen>
              <RotationSummaryCards
                rotations={(rotations ?? []) as { id: string; title: string; date: string; meta: { detail?: string } | null }[]}
                entries={(allEntries ?? []) as { date: string }[]}
                cases={(allCases ?? []) as { date: string }[]}
              />
            </DashboardSection>
          )}

          {Object.keys(clinicalAreaCounts).length > 0 && (
            <DashboardSection title="Clinical areas" subtitle="cases by clinical setting">
              <SpecialtyRadar counts={clinicalAreaCounts} fullWidth />
            </DashboardSection>
          )}
        </div>

        {/* Right widgets column */}
        <div className="space-y-4 mt-5 xl:mt-0">
          <ResumeDraftsCard />
          <CalendarWidget items={calendarItems} />
          <UpcomingTimeline items={upcomingItems} />
          {specialtyProgressRows.length > 0 && (
            <SpecialtyProgressPanel rows={specialtyProgressRows} />
          )}
        </div>
      </div>

      {/* Recent activity - full width */}
      <div className="mt-5">
        <DashboardSection title="Recent activity">
          <ActivityFeed
            entries={(recentEntries ?? []) as PortfolioEntry[]}
            cases={(recentCases ?? []) as Case[]}
            specialtyScores={specialtyScores}
          />
        </DashboardSection>
      </div>
    </PullToRefresh>
  )
}

function buildEntriesOverTime(entries: { category: string; created_at: string }[], cases: { created_at: string }[]): EntriesOverTimeBucket[] {
  const now = new Date()
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return {
      key,
      month: date.toLocaleDateString('en-GB', { month: 'short' }),
      cases: 0,
      audit_qip: 0,
      teaching: 0,
      conference: 0,
      publication: 0,
      leadership: 0,
      prize: 0,
      procedure: 0,
      reflection: 0,
      custom: 0,
    }
  })
  const byKey = Object.fromEntries(months.map(month => [month.key, month]))
  entries.forEach(entry => {
    const d = new Date(entry.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const bucket = byKey[key]
    if (bucket && entry.category in bucket) {
      bucket[entry.category as Category] += 1
    }
  })
  cases.forEach(item => {
    const d = new Date(item.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (byKey[key]) byKey[key].cases += 1
  })
  return months.map(({ key: _key, ...bucket }) => bucket)
}


/** Compact specialty progress panel for the right column.
 *  Points-based specialties (IMT, etc) show "11/30 pts"; evidence-based ones
 *  show "N/M criteria". The percent stays as a quick scan summary. */
function SpecialtyProgressPanel({ rows }: { rows: { id: string; label: string; percent: number; entryCount: number; scoreLabel: string }[] }) {
  return (
    <div className="bg-surface-1 border border-subtle rounded-lg overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-subtle">
        <p className="text-sm font-semibold text-fg">Specialty progress</p>
        <p className="mt-0.5 text-[11px] text-fg-2">
          Points scored against the official scoring matrix.
        </p>
      </div>
      <div className="divide-y divide-subtle">
        {rows.map(row => (
          <div key={row.id} className="px-4 py-3 space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-fg truncate">{row.label}</p>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-fg">
                {row.scoreLabel}
                <span className="ml-1.5 text-xs font-normal text-fg-2">{row.percent}%</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${row.percent}%` }} />
            </div>
            <p className="text-[11px] text-fg-3">
              {row.entryCount} {row.entryCount === 1 ? 'entry' : 'entries'} linked
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

