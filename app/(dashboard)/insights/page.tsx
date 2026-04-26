import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSpecialtyConfig } from '@/lib/specialties'
import InsightsCharts from '@/components/insights/insights-charts'

type EntryRow = {
  id: string
  title: string
  category: string | null
  date: string | null
  specialty_tags: string[] | null
  created_at: string
}

type CaseRow = {
  id: string
  title: string
  date: string | null
  specialty_tags: string[] | null
  created_at: string
}

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function last12Months(): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

function monthLabel(ym: string): string {
  const [year, month] = ym.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return d.toLocaleString('en-GB', { month: 'short', year: '2-digit' })
}

export default async function InsightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: rawEntries }, { data: rawCases }, { data: profile }] = await Promise.all([
    supabase
      .from('portfolio_entries')
      .select('id, title, category, date, specialty_tags, created_at')
      .is('deleted_at', null),
    supabase
      .from('cases')
      .select('id, title, date, specialty_tags, created_at')
      .is('deleted_at', null),
    supabase
      .from('profiles')
      .select('created_at')
      .eq('id', user!.id)
      .single(),
  ])

  const entries: EntryRow[] = rawEntries ?? []
  const cases: CaseRow[] = rawCases ?? []

  // Entries by month (last 12)
  const months = last12Months()
  const entriesByMonth = months.map(m => {
    const portfolio = entries.filter(e => {
      const d = e.date ?? e.created_at
      return formatMonth(d) === m
    }).length
    const casesCount = cases.filter(c => {
      const d = c.date ?? c.created_at
      return formatMonth(d) === m
    }).length
    return { month: monthLabel(m), portfolio, cases: casesCount }
  })

  // Day of week distribution (0=Sun ... 6=Sat)
  const dayOfWeekCounts: number[] = [0, 0, 0, 0, 0, 0, 0]
  for (const e of entries) {
    const d = new Date(e.date ?? e.created_at)
    if (!isNaN(d.getTime())) dayOfWeekCounts[d.getDay()]++
  }
  for (const c of cases) {
    const d = new Date(c.date ?? c.created_at)
    if (!isNaN(d.getTime())) dayOfWeekCounts[d.getDay()]++
  }

  // Top specialties
  const specCount: Record<string, number> = {}
  for (const e of entries) {
    for (const tag of e.specialty_tags ?? []) {
      specCount[tag] = (specCount[tag] ?? 0) + 1
    }
  }
  for (const c of cases) {
    for (const tag of c.specialty_tags ?? []) {
      specCount[tag] = (specCount[tag] ?? 0) + 1
    }
  }
  const topSpecialties = Object.entries(specCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key, count]) => ({ name: getSpecialtyConfig(key)?.name ?? key, count }))

  // Timeline (last 6 months)
  const last6 = last12Months().slice(6)
  const timelineByMonth = last6
    .map(m => {
      const monthEntries = entries
        .filter(e => formatMonth(e.date ?? e.created_at) === m)
        .map(e => ({ id: e.id, title: e.title ?? 'Untitled', type: 'entry' as const, category: e.category ?? undefined }))
      const monthCases = cases
        .filter(c => formatMonth(c.date ?? c.created_at) === m)
        .map(c => ({ id: c.id, title: c.title ?? 'Untitled', type: 'case' as const }))
      return {
        month: monthLabel(m),
        items: [...monthEntries, ...monthCases],
      }
    })
    .filter(m => m.items.length > 0)
    .reverse()

  // Avg/week since account creation
  const accountCreatedAt = profile?.created_at ? new Date(profile.created_at).getTime() : Date.now()
  const weeksActive = Math.max(1, Math.floor((Date.now() - accountCreatedAt) / (7 * 24 * 60 * 60 * 1000)))
  const avgPerWeek = ((entries.length + cases.length) / weeksActive).toFixed(1)

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <nav className="flex items-center gap-1.5 text-xs text-[rgba(245,245,242,0.4)] mb-6">
        <Link href="/dashboard" className="hover:text-[#F5F5F2] transition-colors">Dashboard</Link>
        <span>/</span>
        <span className="text-[rgba(245,245,242,0.7)]">Insights</span>
      </nav>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Insights</h1>
        <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">Your portfolio activity at a glance.</p>
      </div>
      <InsightsCharts
        entriesByMonth={entriesByMonth}
        dayOfWeekCounts={dayOfWeekCounts}
        totalPortfolio={entries.length}
        totalCases={cases.length}
        topSpecialties={topSpecialties}
        timelineByMonth={timelineByMonth}
        avgPerWeek={avgPerWeek}
      />
    </div>
  )
}
