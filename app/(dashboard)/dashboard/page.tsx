import { createClient } from '@/lib/supabase/server'
import { getSpecialtyConfig, calculateDomainsScore, calculateBonusScore, isEvidenceBased, getEvidenceProgress } from '@/lib/specialties'
import type { SpecialtyEntryLink } from '@/lib/specialties'
import { filterLinksToActiveEntries } from '@/lib/specialties/active-links'
import ActivityFeed from '@/components/dashboard/activity-feed'
import OnboardingChecklist from '@/components/dashboard/onboarding-checklist'
import CoverageWidget from '@/components/dashboard/coverage-widget'
import QuickAddButton from '@/components/dashboard/quick-add-button'
import ActivityHeatmap from '@/components/dashboard/activity-heatmap'
import StreakBadge from '@/components/dashboard/streak-badge'
import SpecialtyRadar from '@/components/dashboard/specialty-radar'
import CompetencyThemeWidget from '@/components/dashboard/competency-theme-widget'
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
import { CATEGORIES, type Category, type PortfolioEntry } from '@/lib/types/portfolio'
import type { Case } from '@/lib/types/cases'
import { careerStageLabel } from '@/lib/constants/career-stages'
import { buildThemeCoverage } from '@/lib/portfolio/theme-coverage'
import { countGoalProgress } from '@/lib/goals/progress'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ password?: string; referral?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 364) // 52 weeks to match heatmap window
  // The deadline window is a calendar-date comparison against due_date (a bare
  // YYYY-MM-DD), so bucket "today"/"+30d" by the UK calendar (Europe/London),
  // not UTC. toISOString() here mis-bucketed a due-today deadline for a BST user
  // in the ~00:00-01:00 local hour (same class as the Horus M-4 bug). This also
  // matches the London-keyed heatmap logic further down this page.
  const today = londonDateKey(new Date())
  const in30 = new Date()
  in30.setDate(in30.getDate() + 30)
  const in30Str = londonDateKey(in30)

  const [
    { data: profile },
    { data: trackedSpecialtyRows },
    { data: recentEntries },
    { data: recentCases },
    { data: allEntries },
    { data: allCases },
    { data: deadlines },
    { data: goals },
    { data: rotations },
    { data: customCompetencyThemes },
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
      .select('id, category, specialty_tags, interview_themes, created_at, date, is_demo')
      .eq('user_id', user!.id)
      .is('deleted_at', null),
    supabase
      .from('cases')
      .select('id, specialty_tags, clinical_domain, clinical_domains, interview_themes, created_at, date, is_demo')
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
      .select('category, target_count, due_date, start_date')
      .eq('user_id', user!.id)
      .is('completed_at', null)
      .gte('due_date', today)
      .lte('due_date', in30Str)
      .order('due_date', { ascending: true })
      .limit(10),
    supabase
      .from('personal_log')
      .select('id, title, date, meta')
      .eq('user_id', user!.id)
      .eq('kind', 'rotation')
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(8),
    supabase
      .from('custom_competency_themes')
      .select('name, slug')
      .eq('user_id', user!.id)
      .order('name', { ascending: true }),
  ])
  // Demo starter pack is now seeded once at /api/onboarding/complete (F-014/F-031),
  // so by the time any dashboard renders the demo rows already exist - no seed on
  // this hot path.
  // Do not interrupt newly onboarded users with release notes that predate
  // their account. Existing users see announcements newer than their last
  // dismissal, while dismissal remains persisted on the profile.
  const changelogCutoff = profile?.changelog_seen_at ?? profile?.created_at
  const changelogEntries = CHANGELOG.filter(entry => !changelogCutoff || new Date(entry.date).getTime() > new Date(changelogCutoff).getTime())
  // Headline progress (stat tiles, heatmap, coverage, clinical-area radar,
  // time-since, trends, calendar) excludes is_demo rows so clearly-labelled
  // example entries never inflate the user's own numbers (F-022). The demo
  // banner and the recent-activity feed still surface the demos so the user can
  // find and edit them.
  const realEntries = (allEntries ?? []).filter(entry => !entry.is_demo)
  const realCases = (allCases ?? []).filter(c => !c.is_demo)
  // Keep the "these are example entries" banner up for as long as seeded demo
  // data is still present and the user hasn't dismissed/removed it (QOL-007).
  const hasDemoData = (allEntries ?? []).some(entry => entry.is_demo) || (allCases ?? []).some(c => c.is_demo)
  const showDemoBanner = hasDemoData && !profile?.demo_dismissed_at
  const showOnboardingChecklist = Boolean(profile && !profile.onboarding_checklist_dismissed)

  const applicationIds = (trackedSpecialtyRows ?? []).map(r => r.id)
  const { data: specialtyLinksRaw } = applicationIds.length > 0
    ? await supabase.from('specialty_entry_links').select('*').in('application_id', applicationIds)
    : { data: [] as SpecialtyEntryLink[] }
  // We already fetched every active (non-deleted) portfolio entry and case
  // above, so pass their ids to avoid extra round-trips just to re-check which
  // are active (F-031 hot-path query elimination).
  const activeEntryIds = new Set((allEntries ?? []).map(entry => entry.id))
  const activeCaseIds = new Set((allCases ?? []).map(c => c.id))
  const specialtyLinks = await filterLinksToActiveEntries(
    supabase,
    (specialtyLinksRaw ?? []) as SpecialtyEntryLink[],
    activeEntryIds,
    activeCaseIds
  )

  const coverageCounts = Object.entries(
    realEntries.reduce((acc: Record<string, number>, entry) => {
      acc[entry.category] = (acc[entry.category] ?? 0) + 1
      return acc
    }, {})
  ).map(([category, count]) => ({ category, count }))

  const themeCoverage = buildThemeCoverage(
    realEntries as { interview_themes?: string[] | null }[],
    realCases as { interview_themes?: string[] | null }[],
    customCompetencyThemes ?? []
  )

  const clinicalAreaCounts: Record<string, number> = {}
  realCases.forEach(c => {
    const domains: string[] = (c as { clinical_domains?: string[] }).clinical_domains?.length
      ? (c as { clinical_domains: string[] }).clinical_domains
      : c.clinical_domain ? [c.clinical_domain] : []
    domains.forEach(domain => { clinicalAreaCounts[domain] = (clinicalAreaCounts[domain] ?? 0) + 1 })
  })

  // Heatmap data is derived from the demo-excluded realEntries/realCases
  // (already fetched above) filtered to the 52-week window - two fewer queries
  // per dashboard load, and demo rows never colour the activity grid (F-022).
  // If allEntries is ever paginated, restore dedicated windowed queries.
  const heatmapCreatedAts = [
    ...realEntries.map((e: { created_at: string }) => e.created_at),
    ...realCases.map((c: { created_at: string }) => c.created_at),
  ].filter(createdAt => new Date(createdAt).getTime() >= cutoff.getTime())
  const heatmapDates = heatmapCreatedAts.map(createdAt => createdAt.split('T')[0])
  const activeWeeks = ((profile?.streak_cache as { active_weeks?: string[] } | null)?.active_weeks ?? [])
  const todayLondon = londonDateKey(new Date())
  const hasEntryToday = heatmapCreatedAts.some(createdAt => londonDateKey(createdAt) === todayLondon)
  const anniversaryYear = profile?.created_at
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (365 * 24 * 60 * 60 * 1000))
    : 0
  const showAnniversary = anniversaryYear > (profile?.last_anniversary_seen_year ?? 0)

  const upcomingItems = [
    ...(deadlines ?? []).map(d => ({ id: d.id, title: d.title, date: d.due_date, type: 'Deadline' as const, progress: undefined })),
    // Progress is a neutral logged-count only ("N of target logged"), never a
    // pace/readiness judgement (owner red-line) - see lib/goals/progress.ts.
    ...(goals ?? []).filter(g => g.due_date).map(g => ({
      id: `${g.category}-${g.due_date}`,
      title: `${g.target_count} ${CATEGORIES.find(category => category.value === g.category)?.label ?? g.category}`,
      date: g.due_date,
      type: 'Goal' as const,
      progress: `${countGoalProgress({ category: g.category, start_date: g.start_date }, realEntries)} of ${g.target_count} logged`,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5)

  // Specialty progress: one pass over the tracked rows computes both shapes -
  // the right-column panel rows (percent + score label) and the activity-feed
  // score rows. For points-based specialties (e.g. IMT 11/30) the score comes
  // from the same calculateTotalScore the tracker uses; evidence-based
  // specialties (person spec only) fall back to essentials/desirables counts.
  const specialtyProgressData = (trackedSpecialtyRows ?? []).map(row => {
    const links = specialtyLinks.filter(link => link.application_id === row.id)
    const entryCount = new Set(links.map(link => link.entry_id)).size
    const config = getSpecialtyConfig(row.specialty_key)
    const emptyScore = { score: 0, maxScore: 0, essentialsMet: 0, essentialsTotal: 0, desirablesEvidenced: 0, desirablesTotal: 0 }
    if (!config) {
      // formatSpecialtyLabel falls back to a tidy capitalised label so we never
      // render the raw slug (e.g. "acute_internal_medicine") on the dashboard.
      const label = formatSpecialtyLabel(row.specialty_key)
      return {
        progress: { id: row.id, label, percent: 0, entryCount, scoreLabel: '0' },
        score: { key: row.id, label, isEvidenceBased: false, ...emptyScore },
      }
    }
    if (isEvidenceBased(config)) {
      const progress = getEvidenceProgress(config, links)
      const denom = progress.essentialsTotal + progress.desirablesTotal
      const numer = progress.essentialsMet + progress.desirablesEvidenced
      return {
        progress: {
          id: row.id,
          label: config.name,
          percent: denom === 0 ? 0 : Math.round((numer / denom) * 100),
          entryCount,
          scoreLabel: `${numer}/${denom} criteria`,
        },
        score: {
          key: row.id,
          label: config.name,
          isEvidenceBased: true,
          ...emptyScore,
          essentialsMet: progress.essentialsMet,
          essentialsTotal: progress.essentialsTotal,
          desirablesEvidenced: progress.desirablesEvidenced,
          desirablesTotal: progress.desirablesTotal,
        },
      }
    }
    // totalMax is the domain maximum from the official matrix; a claimed
    // bonus sits on top, so it is shown as "+N" rather than folded into the
    // score (which would read "35/30 pts (117%)").
    const score = calculateDomainsScore(config, links)
    const bonus = calculateBonusScore(config, { ...row, user_id: user!.id, cycle_year: config.cycleYear, created_at: '', is_active: true, archived_at: null })
    const max = config.totalMax
    return {
      progress: {
        id: row.id,
        label: config.name,
        percent: max === 0 ? 0 : Math.min(Math.round((score / max) * 100), 100),
        entryCount,
        scoreLabel: bonus > 0 ? `${score}+${bonus}/${max} pts` : `${score}/${max} pts`,
      },
      score: { key: row.id, label: config.name, isEvidenceBased: false, ...emptyScore, score, maxScore: max },
    }
  })
  const specialtyProgressRows = specialtyProgressData.map(item => item.progress)
  const specialtyScores = specialtyProgressData.map(item => item.score)

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
  const entriesOverTime = buildEntriesOverTime(realEntries, realCases)
  const timeSinceRows = buildTimeSinceRows(realEntries as { category: Category; created_at: string }[], realCases as { created_at: string }[])
  const calendarItems: CalendarWidgetItem[] = [
    ...realEntries.map(entry => ({ date: entry.date, type: 'entry' as const })),
    ...realCases.map(c => ({ date: c.date, type: 'case' as const })),
    ...(deadlines ?? []).map(deadline => ({ date: deadline.due_date, type: 'deadline' as const, title: deadline.title })),
  ]

  return (
    <PullToRefresh className="p-6 lg:p-8 max-w-container mx-auto w-full">
      <SectionHeader
        title="Dashboard"
        sub={profile?.career_stage ? careerStageLabel(profile.career_stage) : undefined}
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
      {resolvedSearchParams?.password === 'updated' && (
        <div role="status" className="mb-6 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-[var(--success)]">
          Password updated successfully.
        </div>
      )}
      {resolvedSearchParams?.referral === 'existing-account' && (
        <div role="status" className="mb-6 rounded-2xl border border-accent/25 bg-accent/10 px-4 py-3 text-sm text-[var(--accent-soft-text)]">
          Referral links only apply to brand-new signups, so this one couldn&apos;t be added to your existing account.
        </div>
      )}
      {!showOnboardingChecklist && <GuidedTour userId={user!.id} initialStep={profile?.guided_tour_step ?? 0} />}
      <CareerWelcomeCard stage={profile?.career_stage} caseCount={realCases.length} />
      <DemoStarterCard show={showDemoBanner} />

      {showOnboardingChecklist && (
        <OnboardingChecklist
          completedItems={(profile as { onboarding_checklist_completed_items?: string[] }).onboarding_checklist_completed_items ?? []}
          accountCreatedAt={user!.created_at}
          autoCompleted={[
            realEntries.length > 0 ? 'portfolio_entry' : null,
            realCases.length > 0 ? 'case' : null,
            (trackedSpecialtyRows ?? []).length > 0 ? 'specialty' : null,
            (deadlines?.length ?? 0) > 0 || (goals?.length ?? 0) > 0 ? 'deadline' : null,
          ].filter((value): value is string => Boolean(value))}
        />
      )}

      {!hasEntryToday && <EmptyDayPrompt />}

      {/* New-account quick-start: show until the user has logged 3 entries / 3 cases. */}
      {(() => {
        const portfolioCount = realEntries.length
        const caseCount = realCases.length
        const isNew = portfolioCount < 3 && caseCount < 3
        if (!isNew || showOnboardingChecklist) return null
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
              value={realEntries.length}
              sub="across all categories"
              barColour="violet"
            />
            <StatTile
              label="Cases logged"
              value={realCases.length}
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

          {/* Charts only render once the user has logged something real - empty months
              (and demo-only accounts) are noise. */}
          {(realEntries.length > 0 || realCases.length > 0) && (
            <DashboardSection title="Trends" subtitle="entries logged per month" defaultOpen>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <EntriesOverTime data={entriesOverTime} />
                <TimeSinceCard rows={timeSinceRows} />
              </div>
            </DashboardSection>
          )}

          {realEntries.length > 0 && (
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
                entries={realEntries as { date: string }[]}
                cases={realCases as { date: string }[]}
              />
            </DashboardSection>
          )}

          {Object.keys(clinicalAreaCounts).length > 0 && (
            <DashboardSection title="Clinical areas" subtitle="cases by clinical setting">
              <SpecialtyRadar counts={clinicalAreaCounts} fullWidth />
            </DashboardSection>
          )}

          {(realEntries.length > 0 || realCases.length > 0) && (
            <DashboardSection title="Competency themes" subtitle="entries and cases by theme tag">
              <CompetencyThemeWidget rows={themeCoverage} />
            </DashboardSection>
          )}
        </div>

        {/* Right widgets column */}
        <div className="space-y-4 mt-5 xl:mt-0">
          <ResumeDraftsCard userId={user!.id} />
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
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${row.percent}%` }} />
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
