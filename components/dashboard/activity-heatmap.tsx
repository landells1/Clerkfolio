// Server component - no 'use client'

interface ActivityHeatmapProps {
  dates: string[] // YYYY-MM-DD strings
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
// Show Mon / Wed / Fri, blank for other rows
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', '']

const WEEKS     = 52
const CELL      = 16  // px - cell width & height
const GAP       = 3   // px - gap between cells
const LABEL_W   = 24  // px - day-label column width
const LABEL_GAP = 8   // px - gap between day labels and the cell grid

// Warm green-to-amber ramp - empty days fade, light activity reads as healthy
// green, heavy activity tilts amber to draw the eye. Empty cells use the
// theme-aware overlay token (not a raw white-tinted rgba) so they read as a
// faint but visible square against the cream surface, not an invisible one.
function cellColor(count: number): string {
  if (count === 0) return 'var(--bg-overlay-soft)'
  if (count === 1) return 'rgba(34, 197, 94, 0.30)'   // green-500 @ 30%
  if (count === 2) return 'rgba(34, 197, 94, 0.65)'   // green-500 @ 65%
  return 'rgba(245, 158, 11, 0.85)'                    // amber-500
}

function cellTitle(count: number, dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  const formatted = d.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
  if (count === 0) return `No entries - ${formatted}`
  return `${count} ${count === 1 ? 'entry' : 'entries'} - ${formatted}`
}

export default function ActivityHeatmap({ dates }: ActivityHeatmapProps) {
  // Build date → count map
  const countMap = new Map<string, number>()
  for (const d of dates) {
    countMap.set(d, (countMap.get(d) ?? 0) + 1)
  }

  // Start from the Monday (WEEKS - 1) weeks ago
  const today     = new Date()
  const dayOfWeek = today.getUTCDay() // 0 = Sun
  const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const thisMonday = new Date(today)
  thisMonday.setUTCDate(today.getUTCDate() + diffToMon)

  const startDate = new Date(thisMonday)
  startDate.setUTCDate(thisMonday.getUTCDate() - (WEEKS - 1) * 7)

  // Build WEEKS × 7 grid (indexed [week][day], day 0 = Mon)
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

  // Month label: show at the first week whose Monday is in a new month
  const monthLabels: string[] = weeks.map((week, i) => {
    const thisMonth = new Date(week[0].dateStr + 'T12:00:00Z').getUTCMonth()
    if (i === 0) return MONTHS[thisMonth]
    const prevMonth = new Date(weeks[i - 1][0].dateStr + 'T12:00:00Z').getUTCMonth()
    return thisMonth !== prevMonth ? MONTHS[thisMonth] : ''
  })

  const total = dates.length

  return (
    <div className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
        <p className="text-[13px] font-semibold text-[var(--text-primary)]">Activity</p>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[var(--text-secondary)]">Less</span>
          {(['rgba(245,245,242,0.05)', 'rgba(34, 197, 94, 0.30)', 'rgba(34, 197, 94, 0.65)', 'rgba(245, 158, 11, 0.85)'] as const).map((color, i) => (
            <div key={i} className="rounded-sm" style={{ width: CELL - 3, height: CELL - 3, background: color }} />
          ))}
          <span className="text-[10px] text-[var(--text-secondary)]">More</span>
        </div>
      </div>

      <div className="px-5 pt-4 pb-5">
        {/* The cell grid is wider than narrow viewports. `overflow-hidden` used
            to hard-clip the oldest weeks off the left edge, which meant the
            first visible month label sat flush against the clip boundary with
            no leading space and no clear "this continues off-screen" cue - it
            read as misplaced rather than clipped. A horizontally scrollable
            region communicates the cutoff properly and keeps all 52 weeks of
            data reachable. The direction:rtl/ltr pair is a pure-CSS trick to
            make the scroll position default to the right edge (most recent
            weeks) without needing a client component + onMount scrollLeft. */}
        <div className="overflow-x-auto" style={{ direction: 'rtl' }}>
          <div style={{ direction: 'ltr' }}>
            {/* Month label row - offset by the label column so columns line up */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: GAP,
                paddingLeft: LABEL_W + LABEL_GAP,
                marginBottom: 5,
              }}
            >
              {monthLabels.map((label, i) => (
                <div key={i} style={{ width: CELL, flexShrink: 0, overflow: 'visible' }}>
                  {label ? (
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        lineHeight: 1,
                        letterSpacing: '0.02em',
                      }}
                    >
                      {label}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>

            {/* One row per weekday - label + that day's cell across every week */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
              {DAY_LABELS.map((label, day) => (
                <div key={day} style={{ display: 'flex', alignItems: 'center', gap: LABEL_GAP }}>
                  {/* Day label - fixed width, right-aligned */}
                  <div
                    style={{
                      width: LABEL_W,
                      flexShrink: 0,
                      textAlign: 'right',
                      fontSize: 10,
                      color: 'var(--text-secondary)',
                      lineHeight: 1,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {label}
                  </div>

                  {/* Cells for this weekday across all weeks. */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: GAP, flex: 1, minWidth: 0 }}>
                    {weeks.map((week, wi) => {
                      const { dateStr, count } = week[day]
                      return (
                        <div
                          key={wi}
                          title={cellTitle(count, dateStr)}
                          style={{
                            width: CELL,
                            height: CELL,
                            flexShrink: 0,
                            background: cellColor(count),
                            borderRadius: 3,
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p
          style={{ marginTop: 12, fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.01em' }}
        >
          {total} {total === 1 ? 'entry' : 'entries'} in the last year
        </p>
      </div>
    </div>
  )
}
