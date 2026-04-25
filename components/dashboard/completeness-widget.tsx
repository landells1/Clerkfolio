type Props = {
  catMap: Record<string, number>
  totalCases: number
  specialtyCount: number
}

export default function CompletenessWidget({ catMap, totalCases, specialtyCount }: Props) {
  const SCORED_CATS = ['audit_qip', 'teaching', 'conference', 'publication', 'leadership', 'prize', 'procedure', 'reflection']
  const catsWithEntries = SCORED_CATS.filter(c => (catMap[c] ?? 0) > 0).length
  const catScore = Math.min((catsWithEntries / SCORED_CATS.length) * 50, 50)
  const caseScore = Math.min((totalCases / 20) * 25, 25)
  const specialtyScore = Math.min((specialtyCount / 5) * 25, 25)
  const total = Math.round(catScore + caseScore + specialtyScore)

  const label = total < 30 ? 'Just getting started' : total < 60 ? 'Building up' : total < 85 ? 'Strong portfolio' : 'Excellent'

  // Find first missing category to generate a hint
  const missingCat = SCORED_CATS.find(c => (catMap[c] ?? 0) === 0)
  const CAT_NAMES: Record<string, string> = {
    audit_qip: 'audit/QI', teaching: 'teaching', conference: 'conference',
    publication: 'publication', leadership: 'leadership', prize: 'prize',
    procedure: 'procedure', reflection: 'reflection',
  }
  const nextThreshold = total < 30 ? 30 : total < 60 ? 60 : total < 85 ? 85 : 100
  const hint = missingCat
    ? `Add a ${CAT_NAMES[missingCat]} entry to reach ${nextThreshold}%`
    : `${catsWithEntries}/${SCORED_CATS.length} categories covered`

  // SVG ring
  const r = 28
  const circumference = 2 * Math.PI * r
  const strokeDash = (total / 100) * circumference

  // Ring colour based on score
  const ringColor = total < 30 ? '#F87171' : total < 60 ? '#FBBF24' : '#1B6FD9'

  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl">
      {/* Widget header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <p className="text-[13px] font-semibold text-[#F5F5F2] whitespace-nowrap">Portfolio completeness</p>
        <span className="text-[11px] text-[rgba(245,245,242,0.35)]">{label}</span>
      </div>

      {/* Body */}
      <div className="flex items-center gap-4 p-4">
        {/* Ring */}
        <div className="flex-shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72">
            {/* Track */}
            <circle
              cx="36" cy="36" r={r}
              fill="none"
              stroke="rgba(245,245,242,0.06)"
              strokeWidth="6"
            />
            {/* Progress */}
            <circle
              cx="36" cy="36" r={r}
              fill="none"
              stroke={ringColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${circumference}`}
              strokeDashoffset={0}
              transform="rotate(-90 36 36)"
            />
            {/* Percent label */}
            <text
              x="36" y="33"
              textAnchor="middle"
              fill="#F5F5F2"
              fontSize="18"
              fontWeight="700"
              fontFamily="Inter, sans-serif"
            >
              {total}
            </text>
            <text
              x="36" y="46"
              textAnchor="middle"
              fill="rgba(245,245,242,0.4)"
              fontSize="10"
              fontFamily="Inter, sans-serif"
            >
              %
            </text>
          </svg>
        </div>

        {/* Status + hint */}
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-sm font-semibold text-[#F5F5F2]">{label}</p>
          <p className="text-xs text-[rgba(245,245,242,0.4)] leading-snug">{hint}</p>
        </div>
      </div>
    </div>
  )
}
