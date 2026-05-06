type LogRow = {
  title: string
  meta: { detail?: string } | null
}

const TYPES = ['CBD', 'Mini-CEX', 'DOPS', 'ACAT']

export default function WbaHeatmap({ rows }: { rows: LogRow[] }) {
  const rotationLabels = Array.from(new Set(rows.map(row => row.meta?.detail || 'Unassigned')))
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#141416] p-5">
      <h2 className="mb-4 text-base font-semibold text-[#F5F5F2]">WBA by rotation</h2>
      <table className="min-w-[520px] w-full text-left text-sm">
        <thead className="text-xs text-[rgba(245,245,242,0.45)]">
          <tr>
            <th className="pb-2">Rotation</th>
            {TYPES.map(type => <th key={type} className="pb-2">{type}</th>)}
          </tr>
        </thead>
        <tbody>
          {rotationLabels.map(rotation => (
            <tr key={rotation} className="border-t border-white/[0.06]">
              <td className="py-2 text-[#F5F5F2]">{rotation}</td>
              {TYPES.map(type => {
                const count = rows.filter(row => (row.meta?.detail || 'Unassigned') === rotation && row.title.toLowerCase().includes(type.toLowerCase())).length
                return <td key={type} className="py-2"><span className="inline-flex min-w-8 justify-center rounded bg-[#1B6FD9]/15 px-2 py-1 text-[#6AA8FF]">{count}</span></td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
