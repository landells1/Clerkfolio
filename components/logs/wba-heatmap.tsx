import { groupWbasByRotation, WBA_TYPES, WBA_TYPE_LABELS, type WbaRow } from '@/lib/logs/wba'
import type { RotationSpan } from '@/lib/logs/rotations'

// WBAs grouped by the rotation whose span (start date to end date, or today
// for an ongoing one) contains each WBA's date - not by the free-text detail.
// Every WBA lands in exactly one cell: unrecognised types go to "DCT / other"
// and WBAs outside every logged rotation get their own row.
export default function WbaHeatmap({ rows, rotations, todayKey }: { rows: WbaRow[]; rotations: RotationSpan[]; todayKey: string }) {
  const grouped = groupWbasByRotation(rows, rotations, todayKey)
  if (grouped.length === 0) return null
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      <h2 className="text-base font-semibold text-[var(--text-primary)]">WBAs by rotation</h2>
      <p className="mb-4 mt-1 text-xs text-[var(--text-muted)]">
        Grouped by the rotation each WBA&apos;s date falls in. Add end dates to your rotations in Logs &gt; Rotations to keep this accurate.
      </p>
      <table className="min-w-[560px] w-full text-left text-sm">
        <thead className="text-xs text-[var(--text-muted)]">
          <tr>
            <th className="pb-2">Rotation</th>
            {WBA_TYPES.map(type => <th key={type} className="pb-2">{WBA_TYPE_LABELS[type]}</th>)}
            <th className="pb-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map(row => (
            <tr key={row.key} className="border-t border-[var(--border-subtle)]">
              <td className="py-2 pr-3 text-[var(--text-primary)]">{row.label}</td>
              {WBA_TYPES.map(type => (
                <td key={type} className="py-2">
                  <span className="inline-flex min-w-8 justify-center rounded bg-[var(--accent-soft)] px-2 py-1 text-[var(--accent-soft-text)]">{row.counts[type]}</span>
                </td>
              ))}
              <td className="py-2 font-semibold text-[var(--text-primary)]">{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
