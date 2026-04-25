// Server component — no 'use client'

interface ActivityHeatmapProps {
  dates: string[] // YYYY-MM-DD strings
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', '']

export default function ActivityHeatmap({ dates }: ActivityHeatmapProps) {
  // Build date → count map
  const countMap = new Map<string, number>()
  for (const d of dates) {
    countMap.set(d, (countMap.get(d) ?? 0) + 1)
  }

  // Find the Monday 12 weeks ago
  const today = new Date()
  const dayOfWeek = today.getUTCDay() // 0=Sun
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const thisMonday = new Date(today)
  thisMonday.setUTCDate(today.getUTCDate() + diffToMonday)

  const startDate = new Date(thisMonday)
  startDate.setUTCDate(thisMonday.getUTCDate() - 11 * 7) // go back 11 more weeks = 12 weeks total

  // Build 12 weeks × 7 days grid
  const WEEKS = 12
  const weeks: { dateStr: string; count: number }[][] = []

  for (let w = 0; w < WEEKS; w++) {
    const week: { dateStr: string; count: number }[] = []
    for (let d = 0; d < 7; d++) {
      const cell = new Date(startDate)
      cell.setUTCDate(startDate.getUTCDate() + w * 7 + d)
      const dateStr = cell.toISOString().split('T')[0]
      week.push({ dateStr, count: countMap.get(dateStr) ?? 0 })
    }
    weeks.push(week)
  }

  // Week totals for sparkbar
  const weekTotals = weeks.map(week => week.reduce((sum, day) => sum + day.count, 0))
  const maxWeekTotal = Math.max(...weekTotals, 1)

  // Month labels: for each week, check if the first day of that week is a different month than the previous week
  const monthLabels: string[] = weeks.map((week, i) => {
    const thisMonth = new Date(week[0].dateStr + 'T12:00:00Z').getUTCMonth()
    if (i === 0) return MONTHS[thisMonth]
    const prevMonth = new Date(weeks[i - 1][0].dateStr + 'T12:00:00Z').getUTCMonth()
    return thisMonth !== prevMonth ? MONTHS[thisMonth] : ''
  })

  // Total entries in last 12 weeks
  const total = dates.length

  function cellColor(count: number): string {
    if (count === 0) return 'rgba(245,245,242,0.04)'
    if (count === 1) return '#0A3260'   // blue-800
    if (count === 2) return '#155BB0'   // blue-600
    return '#3884DD'                    // blue-400
  }

  function cellTitle(count: number, dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00Z')
    const formatted = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    if (count === 0) return `No entries — ${formatted}`
    return `${count} ${count === 1 ? 'entry' : 'entries'} — ${formatted}`
  }

  const CELL_SIZE = 12 // px
  const CELL_GAP = 4   // px
  const SPARKBAR_MAX_H = 20 // px

  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl">
      {/* Widget header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
        <p className="text-[13px] font-semibold text-[#F5F5F2] whitespace-nowrap">Activity</p>
        {/* Less → More legend */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[rgba(245,245,242,0.35)]">Less</span>
          {['rgba(245,245,242,0.04)', '#0A3260', '#155BB0', '#3884DD'].map((color, i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
          ))}
          <span className="text-[10px] text-[rgba(245,245,242,0.35)]">More</span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex gap-3">
          {/* Day labels column */}
          <div className="flex flex-col pt-[calc(20px+4px+16px)] gap-[4px]">
            {DAY_LABELS.map((label, i) => (
              <div key={i} style={{ height: CELL_SIZE }} className="flex items-center">
                <span className="text-[9px] text-[rgba(245,245,242,0.3)] w-6 leading-none">{label}</span>
              </div>
            ))}
          </div>

          {/* Grid body */}
          <div className="flex flex-col">
            {/* Sparkbar row */}
            <div className="flex gap-[4px] mb-1" style={{ height: SPARKBAR_MAX_H }}>
              {weekTotals.map((total, i) => {
                const barH = total === 0 ? 0 : Math.max(3, Math.round((total / maxWeekTotal) * SPARKBAR_MAX_H))
                return (
                  <div key={i} style={{ width: CELL_SIZE }} className="flex items-end">
                    <div
                      style={{
                        width: CELL_SIZE,
                        height: total === 0 ? CELL_SIZE / 2 : barH,
                        background: total === 0 ? 'rgba(245,245,242,0.04)' : '#0F4487',
                        borderRadius: 2,
                      }}
                      title={`${total} entries this week`}
                    />
                  </div>
                )
              })}
            </div>

            {/* Month labels row */}
            <div className="flex gap-[4px] mb-1">
              {monthLabels.map((label, i) => (
                <div key={i} style={{ width: CELL_SIZE }}>
                  <span className="text-[9px] text-[rgba(245,245,242,0.4)] leading-none whitespace-nowrap">{label}</span>
                </div>
              ))}
            </div>

            {/* Heatmap weeks */}
            <div className="flex gap-[4px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[4px]">
                  {week.map(({ dateStr, count }, di) => (
                    <div
                      key={di}
                      title={cellTitle(count, dateStr)}
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        background: cellColor(count),
                        borderRadius: 2,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-[rgba(245,245,242,0.4)] mt-3">
          {total} {total === 1 ? 'entry' : 'entries'} contributed in the last 12 weeks
        </p>
      </div>
    </div>
  )
}
