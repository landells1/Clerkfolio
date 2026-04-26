'use client'

import { useState, useEffect } from 'react'

interface SpecialtyRadarProps {
  counts: Record<string, number>
  fullWidth?: boolean
}

function BarView({ sorted, max, columns = 1 }: { sorted: [string, number][]; max: number; columns?: number }) {
  if (columns === 2 && sorted.length >= 3) {
    return (
      <div className="grid grid-cols-2 gap-x-10 gap-y-2.5">
        {sorted.map(([area, count]) => (
          <div key={area} className="flex items-center gap-3">
            <span className="text-xs text-[rgba(245,245,242,0.7)] w-40 shrink-0 truncate" title={area}>
              {area}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full bg-[#1B6FD9] rounded-full transition-all"
                style={{ width: `${Math.round((count / max) * 100)}%` }}
              />
            </div>
            <span className="text-xs font-mono text-[rgba(245,245,242,0.35)] w-5 text-right shrink-0">
              {count}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {sorted.map(([area, count]) => (
        <div key={area} className="flex items-center gap-3">
          <span className="text-xs text-[rgba(245,245,242,0.7)] w-36 shrink-0 truncate" title={area}>
            {area}
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full bg-[#1B6FD9] rounded-full transition-all"
              style={{ width: `${Math.round((count / max) * 100)}%` }}
            />
          </div>
          <span className="text-xs font-mono text-[rgba(245,245,242,0.35)] w-5 text-right shrink-0">
            {count}
          </span>
        </div>
      ))}
    </div>
  )
}

function RadarView({ sorted, max, fullWidth = false }: { sorted: [string, number][]; max: number; fullWidth?: boolean }) {
  const n = sorted.length
  if (n < 3) return <BarView sorted={sorted} max={max} />

  // Larger chart when full-width
  const cx = fullWidth ? 280 : 210
  const cy = fullWidth ? 200 : 153
  const maxR = fullWidth ? 130 : 88
  const labelR = maxR + (fullWidth ? 36 : 18)
  const vw = fullWidth ? 560 : 420
  const vh = fullWidth ? 400 : 310

  const angles = sorted.map((_, i) => (i / n) * 2 * Math.PI - Math.PI / 2)

  const axisPoints = angles.map(a => ({
    x: cx + maxR * Math.cos(a),
    y: cy + maxR * Math.sin(a),
  }))

  const dataPoints = sorted.map(([, count], i) => {
    const r = (count / max) * maxR
    return { x: cx + r * Math.cos(angles[i]), y: cy + r * Math.sin(angles[i]) }
  })

  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full" aria-label="Clinical area radar chart">
      {[0.25, 0.5, 0.75, 1].map(frac => (
        <polygon
          key={frac}
          points={angles.map(a =>
            `${cx + maxR * frac * Math.cos(a)},${cy + maxR * frac * Math.sin(a)}`
          ).join(' ')}
          fill="none"
          stroke="rgba(245,245,242,0.06)"
          strokeWidth="1"
        />
      ))}
      {axisPoints.map((pt, i) => (
        <line key={i} x1={cx} y1={cy} x2={pt.x} y2={pt.y}
          stroke="rgba(245,245,242,0.08)" strokeWidth="1" />
      ))}
      <polygon
        points={dataPoints.map(p => `${p.x},${p.y}`).join(' ')}
        fill="rgba(27,111,217,0.18)"
        stroke="#1B6FD9"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {dataPoints.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={fullWidth ? 4 : 3} fill="#1B6FD9" />
      ))}
      {sorted.map(([area, count], i) => {
        const cosA = Math.cos(angles[i])
        const sinA = Math.sin(angles[i])
        const lx = cx + labelR * cosA
        const ly = cy + labelR * sinA
        const anchor = cosA > 0.15 ? 'start' : cosA < -0.15 ? 'end' : 'middle'
        const fontSize = fullWidth ? 10 : 8
        const countSize = fullWidth ? 9.5 : 7.5

        let nameY: number, countY: number
        if (sinA < -0.35) {
          nameY = ly - (fullWidth ? 13 : 10); countY = ly - (fullWidth ? 2 : 1)
        } else if (sinA > 0.35) {
          nameY = ly + (fullWidth ? 12 : 9);  countY = ly + (fullWidth ? 23 : 18)
        } else {
          nameY = ly - (fullWidth ? 7 : 5);   countY = ly + (fullWidth ? 7 : 5)
        }

        return (
          <g key={i}>
            <title>{area}: {count}</title>
            <text x={lx} y={nameY} textAnchor={anchor} fontSize={fontSize}
              fill="rgba(245,245,242,0.7)">
              {area}
            </text>
            <text x={lx} y={countY} textAnchor={anchor} fontSize={countSize}
              fill="rgba(245,245,242,0.35)" fontFamily="monospace">
              {count}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function SpecialtyRadar({ counts, fullWidth = false }: SpecialtyRadarProps) {
  const [view, setView] = useState<'bar' | 'radar'>('bar')

  useEffect(() => {
    const stored = localStorage.getItem('clinidex-chart-view')
    if (stored === 'bar' || stored === 'radar') setView(stored)
  }, [])

  function handleSetView(v: 'bar' | 'radar') {
    setView(v)
    localStorage.setItem('clinidex-chart-view', v)
  }

  const sorted = Object.entries(counts)
    .filter(([, c]) => c >= 1)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)

  const max = sorted[0]?.[1] ?? 1

  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-sm font-semibold text-[#F5F5F2]">Clinical area coverage</p>
          <p className="text-xs text-[rgba(245,245,242,0.4)] mt-0.5">Top clinical areas by case count</p>
        </div>
        {sorted.length >= 3 && (
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              onClick={() => handleSetView('bar')}
              title="Bar view"
              className={`p-1.5 rounded-lg transition-colors ${view === 'bar' ? 'bg-[#1B6FD9]/20 text-[#1B6FD9]' : 'text-[rgba(245,245,242,0.3)] hover:text-[rgba(245,245,242,0.6)]'}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </button>
            <button
              onClick={() => handleSetView('radar')}
              title="Radar view"
              className={`p-1.5 rounded-lg transition-colors ${view === 'radar' ? 'bg-[#1B6FD9]/20 text-[#1B6FD9]' : 'text-[rgba(245,245,242,0.3)] hover:text-[rgba(245,245,242,0.6)]'}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 19 7 19 17 12 22 5 17 5 7"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="5" y1="7" x2="19" y2="17"/><line x1="19" y1="7" x2="5" y2="17"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="mt-4">
        {sorted.length === 0 ? (
          <p className="text-xs text-[rgba(245,245,242,0.35)] text-center py-6">
            Log cases with a clinical area set to see coverage here
          </p>
        ) : view === 'radar' ? (
          <RadarView sorted={sorted} max={max} fullWidth={fullWidth} />
        ) : (
          <BarView sorted={sorted} max={max} columns={fullWidth ? 2 : 1} />
        )}
      </div>
    </div>
  )
}
