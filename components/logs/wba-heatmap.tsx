type LogRow = {
  title: string
  meta: { detail?: string } | null
}

const TYPES = ['CBD', 'Mini-CEX', 'DOPS', 'ACAT']

export default function WbaHeatmap({ rows }: { rows: LogRow[] }) {
  const rotationLabels = Array.from(new Set(rows.map(row => row.meta?.detail || 'Unassigned')))
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
      <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">WBA by rotation</h2>
      <table className="min-w-[520px] w-full text-left text-sm">
        <thead className="text-xs text-[var(--text-muted)]">
          <tr>
            <th className="pb-2">Rotation</th>
            {TYPES.map(type => <th key={type} className="pb-2">{type}</th>)}
          </tr>
        </thead>
        <tbody>
          {rotationLabels.map(rotation => (
            <tr key={rotation} className="border-t border-white/[0.06]">
              <td className="py-2 text-[var(--text-primary)]">{rotation}</td>
              {TYPES.map(type => {
                const count = rows.filter(row => (row.meta?.detail || 'Unassigned') === rotation && row.title.toLowerCase().includes(type.toLowerCase())).length
                return <td key={type} className="py-2"><span className="inline-flex min-w-8 justify-center rounded bg-[var(--accent-soft)] px-2 py-1 text-[var(--accent-soft-text)]">{count}</span></td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
