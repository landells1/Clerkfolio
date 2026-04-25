// Server component — no 'use client'

interface SpecialtyRadarProps {
  counts: Record<string, number>
}

export default function SpecialtyRadar({ counts }: SpecialtyRadarProps) {
  // Top 8 clinical areas with at least 1 case
  const sorted = Object.entries(counts)
    .filter(([, c]) => c >= 1)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)

  const max = sorted[0]?.[1] ?? 1

  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5">
      <p className="text-sm font-semibold text-[#F5F5F2] mb-1">Clinical area coverage</p>
      <p className="text-xs text-[rgba(245,245,242,0.4)] mb-4">Top clinical areas by case count</p>

      {sorted.length === 0 ? (
        <p className="text-xs text-[rgba(245,245,242,0.35)] text-center py-6">
          Log cases with a clinical area set to see coverage here
        </p>
      ) : (
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
      )}
    </div>
  )
}
