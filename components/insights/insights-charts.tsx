'use client'

type Props = {
  entriesByMonth: { month: string; portfolio: number; cases: number }[]
  dayOfWeekCounts: number[]
  totalPortfolio: number
  totalCases: number
  topSpecialties: { name: string; count: number }[]
  timelineByMonth: { month: string; items: { title: string; type: 'entry' | 'case'; category?: string }[] }[]
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function InsightsCharts({
  entriesByMonth,
  dayOfWeekCounts,
  totalPortfolio,
  totalCases,
  topSpecialties,
  timelineByMonth,
}: Props) {
  const totalItems = totalPortfolio + totalCases

  // Average per week over last 12 weeks
  const last12Total = entriesByMonth.slice(-3).reduce((acc, m) => acc + m.portfolio + m.cases, 0)
  const avgPerWeek = last12Total > 0 ? (last12Total / 12).toFixed(1) : '0'

  // Bar chart dimensions
  const BAR_W = 10
  const BAR_GAP = 3
  const GROUP_GAP = 8
  const H = 80
  const n = entriesByMonth.length
  const chartWidth = n * (BAR_W * 2 + BAR_GAP + GROUP_GAP)
  const maxVal = Math.max(...entriesByMonth.map(m => Math.max(m.portfolio, m.cases)), 1)

  // Day of week
  const maxDay = Math.max(...dayOfWeekCounts, 1)

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Portfolio entries', value: totalPortfolio },
          { label: 'Cases', value: totalCases },
          { label: 'Total items', value: totalItems },
          { label: 'Avg / week (12mo)', value: avgPerWeek },
        ].map(stat => (
          <div key={stat.label} className="bg-[#141416] border border-white/[0.07] rounded-xl px-4 py-4">
            <p className="text-2xl font-semibold text-[#F5F5F2] tabular-nums">{stat.value}</p>
            <p className="text-xs text-[rgba(245,245,242,0.4)] mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Activity chart */}
      <div className="bg-[#141416] border border-white/[0.07] rounded-xl p-5">
        <h2 className="text-sm font-medium text-[#F5F5F2] mb-4">Activity — last 12 months</h2>
        <div className="flex gap-4 mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#1B6FD9]" />
            <span className="text-xs text-[rgba(245,245,242,0.45)]">Portfolio</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#22d3ee]" />
            <span className="text-xs text-[rgba(245,245,242,0.45)]">Cases</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <svg
            width={chartWidth}
            height={H + 24}
            className="min-w-full"
            style={{ display: 'block' }}
          >
            {entriesByMonth.map((m, i) => {
              const x = i * (BAR_W * 2 + BAR_GAP + GROUP_GAP)
              const portfolioH = maxVal > 0 ? Math.round((m.portfolio / maxVal) * H) : 0
              const casesH = maxVal > 0 ? Math.round((m.cases / maxVal) * H) : 0
              return (
                <g key={m.month}>
                  {/* Portfolio bar */}
                  <rect
                    x={x}
                    y={H - portfolioH}
                    width={BAR_W}
                    height={portfolioH || 2}
                    rx={2}
                    fill="#1B6FD9"
                    opacity={portfolioH === 0 ? 0.15 : 0.85}
                  />
                  {/* Cases bar */}
                  <rect
                    x={x + BAR_W + BAR_GAP}
                    y={H - casesH}
                    width={BAR_W}
                    height={casesH || 2}
                    rx={2}
                    fill="#22d3ee"
                    opacity={casesH === 0 ? 0.15 : 0.75}
                  />
                  {/* Month label */}
                  <text
                    x={x + BAR_W}
                    y={H + 16}
                    textAnchor="middle"
                    fontSize={9}
                    fill="rgba(245,245,242,0.35)"
                    fontFamily="inherit"
                  >
                    {m.month.split(' ')[0]}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Day of week */}
        <div className="bg-[#141416] border border-white/[0.07] rounded-xl p-5">
          <h2 className="text-sm font-medium text-[#F5F5F2] mb-4">Activity by day of week</h2>
          <div className="space-y-2">
            {DAYS.map((day, i) => {
              const count = dayOfWeekCounts[i]
              const pct = maxDay > 0 ? (count / maxDay) * 100 : 0
              return (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-xs text-[rgba(245,245,242,0.4)] w-7 flex-shrink-0">{day}</span>
                  <div className="flex-1 bg-white/[0.05] rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1B6FD9]"
                      style={{ width: `${pct}%`, transition: 'width 0.4s ease' }}
                    />
                  </div>
                  <span className="text-xs text-[rgba(245,245,242,0.35)] tabular-nums w-5 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top specialties */}
        <div className="bg-[#141416] border border-white/[0.07] rounded-xl p-5">
          <h2 className="text-sm font-medium text-[#F5F5F2] mb-4">Top specialties</h2>
          {topSpecialties.length === 0 ? (
            <p className="text-xs text-[rgba(245,245,242,0.35)]">No specialty tags logged yet.</p>
          ) : (
            <div className="space-y-2.5">
              {topSpecialties.map((spec, i) => (
                <div key={spec.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-[rgba(245,245,242,0.3)] tabular-nums w-4 flex-shrink-0">{i + 1}</span>
                    <span className="text-sm text-[rgba(245,245,242,0.75)] truncate capitalize">{spec.name.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="text-xs font-medium text-[#1B6FD9] bg-[#1B6FD9]/10 px-2 py-0.5 rounded-full tabular-nums flex-shrink-0">
                    {spec.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      {timelineByMonth.length > 0 && (
        <div className="bg-[#141416] border border-white/[0.07] rounded-xl p-5">
          <h2 className="text-sm font-medium text-[#F5F5F2] mb-5">Recent activity</h2>
          <div className="space-y-6">
            {timelineByMonth.map(month => (
              <div key={month.month}>
                <p className="text-xs font-semibold text-[rgba(245,245,242,0.45)] uppercase tracking-wider mb-2">{month.month}</p>
                <div className="space-y-1.5 pl-2 border-l border-white/[0.06]">
                  {month.items.map((item, j) => (
                    <div key={j} className="flex items-start gap-2.5 pl-3">
                      <span className={`mt-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded border flex-shrink-0 capitalize ${
                        item.type === 'case'
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                          : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      }`}>
                        {item.type === 'case' ? 'Case' : (item.category?.replace(/_/g, ' ') ?? 'Entry')}
                      </span>
                      <span className="text-sm text-[rgba(245,245,242,0.65)] leading-snug">{item.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
