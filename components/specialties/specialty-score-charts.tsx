'use client'

export function SpecialtyScoreCharts({
  domains,
}: {
  domains: Array<{ key: string; label: string; score: number; max: number }>
}) {
  const maxLabelLength = 28
  const chartDomains = domains.map(domain => ({
    ...domain,
    fraction: domain.max > 0 ? Math.min(domain.score / domain.max, 1) : 0,
    shortLabel: domain.label.length > maxLabelLength ? `${domain.label.slice(0, maxLabelLength - 1)}…` : domain.label,
  }))
  const canRenderRadar = chartDomains.length >= 3
  const centerX = 180
  const centerY = 150
  const radius = 88
  const labelRadius = 118
  const angles = chartDomains.map((_, index) => (index / chartDomains.length) * (Math.PI * 2) - Math.PI / 2)
  const radarPoints = chartDomains.map((domain, index) => {
    const angle = angles[index]
    const scaledRadius = radius * domain.fraction
    return `${centerX + Math.cos(angle) * scaledRadius},${centerY + Math.sin(angle) * scaledRadius}`
  }).join(' ')

  return (
    <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Domain score bars</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">How much of each scored domain you have already claimed.</p>
        </div>
        <div className="space-y-2.5">
          {chartDomains.map(domain => (
            <div key={domain.key} className="flex items-center gap-3">
              <span className="w-40 shrink-0 truncate text-xs text-[var(--text-secondary)]" title={domain.label}>
                {domain.shortLabel}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.round(domain.fraction * 100)}%` }} />
              </div>
              <span className="w-16 shrink-0 text-right text-xs font-mono text-[var(--text-secondary)]">
                {domain.score}/{domain.max}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Domain radar</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Normalised coverage across the scored domains for this specialty.</p>
        </div>
        {canRenderRadar ? (
          <svg viewBox="0 0 360 300" className="w-full" aria-label="Specialty domain radar chart">
            {[0.25, 0.5, 0.75, 1].map(fraction => (
              <polygon
                key={fraction}
                points={angles.map(angle => `${centerX + Math.cos(angle) * radius * fraction},${centerY + Math.sin(angle) * radius * fraction}`).join(' ')}
                fill="none"
                stroke="var(--text-faint)"
                strokeWidth="1"
              />
            ))}
            {angles.map((angle, index) => (
              <line
                key={chartDomains[index].key}
                x1={centerX}
                y1={centerY}
                x2={centerX + Math.cos(angle) * radius}
                y2={centerY + Math.sin(angle) * radius}
                stroke="var(--text-faint)"
                strokeWidth="1"
              />
            ))}
            <polygon points={radarPoints} fill="rgba(27,111,217,0.2)" stroke="#1B6FD9" strokeWidth="1.6" />
            {chartDomains.map((domain, index) => {
              const angle = angles[index]
              const pointX = centerX + Math.cos(angle) * radius * domain.fraction
              const pointY = centerY + Math.sin(angle) * radius * domain.fraction
              const labelX = centerX + Math.cos(angle) * labelRadius
              const labelY = centerY + Math.sin(angle) * labelRadius
              const textAnchor = Math.cos(angle) > 0.2 ? 'start' : Math.cos(angle) < -0.2 ? 'end' : 'middle'
              return (
                <g key={domain.key}>
                  <circle cx={pointX} cy={pointY} r="3.5" fill="#1B6FD9" />
                  <text x={labelX} y={labelY} textAnchor={textAnchor} fontSize="10" fill="var(--text-secondary)">
                    {domain.shortLabel}
                  </text>
                  <text x={labelX} y={labelY + 12} textAnchor={textAnchor} fontSize="9" fill="var(--text-muted)">
                    {domain.score}/{domain.max}
                  </text>
                </g>
              )
            })}
          </svg>
        ) : (
          <p className="py-12 text-center text-xs text-[var(--text-secondary)]">
            Add more scored domains to render the radar view.
          </p>
        )}
      </section>
    </div>
  )
}
