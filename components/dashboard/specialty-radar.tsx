// Server component — no 'use client'
import { SPECIALTY_CONFIGS } from '@/lib/specialties'

function formatSpecialtyKey(key: string): string {
  const config = SPECIALTY_CONFIGS.find(c => c.key === key)
  if (config) return config.name
  return key.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

interface SpecialtyRadarProps {
  counts: Record<string, number>
}

export default function SpecialtyRadar({ counts }: SpecialtyRadarProps) {
  // Take top 8 specialties with at least 1 count
  const sorted = Object.entries(counts)
    .filter(([, c]) => c >= 1)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)

  if (sorted.length < 3) {
    return (
      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5">
        <p className="text-sm font-semibold text-[#F5F5F2] mb-1">Clinical area coverage</p>
        <p className="text-xs text-[rgba(245,245,242,0.4)] mb-4">Top clinical areas at a glance</p>
        <p className="text-xs text-[rgba(245,245,242,0.35)] text-center py-6">
          Log cases across 3+ clinical areas to see your radar chart
        </p>
      </div>
    )
  }

  const N = sorted.length
  const maxCount = sorted[0][1]
  const CX = 100
  const CY = 100
  const R = 70

  function polarToXY(i: number, fraction: number): { x: number; y: number } {
    const angle = (2 * Math.PI / N) * i - Math.PI / 2
    return {
      x: CX + R * fraction * Math.cos(angle),
      y: CY + R * fraction * Math.sin(angle),
    }
  }

  // Reference rings at 33%, 66%, 100%
  function ringPoints(fraction: number): string {
    return Array.from({ length: N }, (_, i) => {
      const { x, y } = polarToXY(i, fraction)
      return `${x},${y}`
    }).join(' ')
  }

  // Data polygon points
  const dataPoints = sorted.map(([, count], i) => polarToXY(i, count / maxCount))
  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ')

  // Label positioning
  function labelAnchor(i: number): 'start' | 'middle' | 'end' {
    const angle = (2 * Math.PI / N) * i - Math.PI / 2
    const x = Math.cos(angle)
    if (Math.abs(x) < 0.2) return 'middle'
    return x > 0 ? 'start' : 'end'
  }

  function labelPosition(i: number): { x: number; y: number } {
    const angle = (2 * Math.PI / N) * i - Math.PI / 2
    return {
      x: CX + (R + 14) * Math.cos(angle),
      y: CY + (R + 14) * Math.sin(angle),
    }
  }

  function truncate(name: string, max = 14): string {
    return name.length > max ? name.slice(0, max) + '…' : name
  }

  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5">
      <p className="text-sm font-semibold text-[#F5F5F2] mb-1">Clinical area coverage</p>
      <p className="text-xs text-[rgba(245,245,242,0.4)] mb-4">Top clinical areas at a glance</p>

      <div className="flex justify-center">
        <svg
          viewBox="0 0 200 200"
          width="200"
          height="200"
          aria-label="Specialty radar chart"
        >
          {/* Reference rings */}
          {[0.33, 0.66, 1].map((frac, ri) => (
            <polygon
              key={ri}
              points={ringPoints(frac)}
              fill="none"
              stroke="rgba(245,245,242,0.06)"
              strokeWidth="1"
            />
          ))}

          {/* Axis lines */}
          {Array.from({ length: N }, (_, i) => {
            const tip = polarToXY(i, 1)
            return (
              <line
                key={i}
                x1={CX}
                y1={CY}
                x2={tip.x}
                y2={tip.y}
                stroke="rgba(245,245,242,0.08)"
                strokeWidth="1"
              />
            )
          })}

          {/* Data polygon */}
          <polygon
            points={dataPolygon}
            fill="rgba(29,158,117,0.2)"
            stroke="#1B6FD9"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Data point circles */}
          {dataPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="#1B6FD9" />
          ))}

          {/* Labels */}
          {sorted.map(([key], i) => {
            const pos = labelPosition(i)
            return (
              <text
                key={i}
                x={pos.x}
                y={pos.y}
                textAnchor={labelAnchor(i)}
                dominantBaseline="middle"
                fill="rgba(245,245,242,0.6)"
                fontSize="8"
              >
                {truncate(formatSpecialtyKey(key))}
              </text>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
