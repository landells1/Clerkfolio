import Link from 'next/link'

// Persistent "Filtered by ..." banner for list pages. Shown whenever a real
// filter is active so a filtered list can never be mistaken for the whole
// list, with the shown-of-total count and a one-click way back to the
// unfiltered view (the bare path - filters are never silently restored).
export default function FilterBanner({
  labels,
  shown,
  total,
  singular,
  plural,
  clearHref,
}: {
  labels: string[]
  shown: number
  total: number
  singular: string
  plural: string
  clearHref: string
}) {
  if (labels.length === 0) return null
  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[var(--info-border)] bg-[var(--info-bg)] px-3.5 py-2.5 text-sm text-[var(--info-text)]"
    >
      <span className="font-medium">
        Showing {shown} of {total} {total === 1 ? singular : plural}
      </span>
      <span className="min-w-0 flex-1 text-xs">Filtered by {labels.join(' · ')}</span>
      <Link href={clearHref} prefetch={false} className="text-xs font-semibold underline underline-offset-2">
        Clear filters
      </Link>
    </div>
  )
}
