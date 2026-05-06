type Rotation = {
  id: string
  title: string
  date: string
  meta: { detail?: string } | null
}

type DatedEntry = {
  date: string
}

function addMonths(date: Date, months: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

export default function RotationSummaryCards({ rotations, entries, cases }: { rotations: Rotation[]; entries: DatedEntry[]; cases: DatedEntry[] }) {
  if (rotations.length === 0) return null
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rotations.slice(0, 4).map(rotation => {
        const start = new Date(rotation.date)
        const end = addMonths(start, 4)
        const inBlock = (item: DatedEntry) => {
          const d = new Date(item.date)
          return d >= start && d < end
        }
        const entryCount = entries.filter(inBlock).length
        const caseCount = cases.filter(inBlock).length
        return (
          <div key={rotation.id} className="rounded-2xl border border-white/[0.08] bg-[#141416] p-5">
            <p className="text-sm font-semibold text-[#F5F5F2]">{rotation.title}</p>
            <p className="mt-1 text-xs text-[rgba(245,245,242,0.4)]">
              {start.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} to {end.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
              {rotation.meta?.detail ? ` · ${rotation.meta.detail}` : ''}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[#0B0B0C] p-3">
                <p className="text-2xl font-semibold text-[#F5F5F2]">{entryCount}</p>
                <p className="text-xs text-[rgba(245,245,242,0.42)]">portfolio entries</p>
              </div>
              <div className="rounded-xl bg-[#0B0B0C] p-3">
                <p className="text-2xl font-semibold text-[#F5F5F2]">{caseCount}</p>
                <p className="text-xs text-[rgba(245,245,242,0.42)]">cases</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
