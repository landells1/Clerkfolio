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
  const colour = total < 30 ? 'bg-red-400' : total < 60 ? 'bg-amber-400' : 'bg-[#1D9E75]'

  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-[#F5F5F2]">Portfolio completeness</p>
        <span className="text-2xl font-bold text-[#F5F5F2]">{total}<span className="text-sm font-normal text-[rgba(245,245,242,0.4)]">%</span></span>
      </div>
      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full transition-all duration-500 ${colour}`} style={{ width: `${total}%` }} />
      </div>
      <p className="text-xs text-[rgba(245,245,242,0.4)]">{label} · {catsWithEntries}/{SCORED_CATS.length} categories covered</p>
    </div>
  )
}
