import Link from 'next/link'
import { countItemsPerRotation, formatRotationSpan, rotationSpans, type RotationRow, type RotationSpan } from '@/lib/logs/rotations'
import { pluralize } from '@/lib/utils/plural'

type DatedEntry = {
  date: string
}

// Rotations shown before the rest fold into "Show all".
const VISIBLE = 4

// Each rotation shows its own span (start date + the end date the user
// entered, or "ongoing") and counts only the entries and cases DATED inside
// that span. An item belongs to exactly one rotation (the most recently
// started one containing it), so overlapping blocks never double count - see
// lib/logs/rotations.ts. Newest rotation first; every rotation is listed.
export default function RotationSummaryCards({
  rotations,
  entries,
  cases,
  todayKey,
}: {
  rotations: RotationRow[]
  entries: DatedEntry[]
  cases: DatedEntry[]
  todayKey: string
}) {
  const spans = rotationSpans(rotations)
  if (spans.length === 0) return null
  const entryCounts = countItemsPerRotation(spans, entries, todayKey)
  const caseCounts = countItemsPerRotation(spans, cases, todayKey)
  const newestFirst = [...spans].reverse()
  const visible = newestFirst.slice(0, VISIBLE)
  const rest = newestFirst.slice(VISIBLE)

  const card = (span: RotationSpan) => (
    <RotationCard
      key={span.id}
      span={span}
      entryCount={entryCounts.get(span.id) ?? 0}
      caseCount={caseCounts.get(span.id) ?? 0}
      upcoming={span.start > todayKey}
    />
  )

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{visible.map(card)}</div>
      {rest.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none text-sm font-medium text-[var(--accent-text)] hover:underline">
            <span className="group-open:hidden">Show all {spans.length} rotations</span>
            <span className="hidden group-open:inline">Show fewer rotations</span>
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">{rest.map(card)}</div>
        </details>
      )}
      <p className="text-xs text-[var(--text-muted)]">
        Counts use the date on each entry and case. Set or change a rotation&apos;s end date in{' '}
        <Link href="/logs/rotations" className="text-[var(--accent-text)] underline">Logs &gt; Rotations</Link>.
      </p>
    </div>
  )
}

function RotationCard({ span, entryCount, caseCount, upcoming }: { span: RotationSpan; entryCount: number; caseCount: number; upcoming: boolean }) {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{span.title}</p>
        {upcoming && (
          <span className="shrink-0 rounded-md bg-[var(--bg-overlay-soft)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-secondary)]">Upcoming</span>
        )}
      </div>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {formatRotationSpan(span)}
        {span.detail ? ` · ${span.detail}` : ''}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-[var(--bg-canvas)] p-3">
          <p className="text-2xl font-semibold text-[var(--text-primary)]">{entryCount}</p>
          <p className="text-xs text-[var(--text-muted)]">{pluralize(entryCount, 'portfolio entry', 'portfolio entries')}</p>
        </div>
        <div className="rounded-xl bg-[var(--bg-canvas)] p-3">
          <p className="text-2xl font-semibold text-[var(--text-primary)]">{caseCount}</p>
          <p className="text-xs text-[var(--text-muted)]">{pluralize(caseCount, 'case')}</p>
        </div>
      </div>
    </div>
  )
}
