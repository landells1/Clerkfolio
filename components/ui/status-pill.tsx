import { STATUS_LABEL, STATUS_COLOUR, statusPulses, type EntryStatus } from '@/lib/statuses'
import { colourClasses } from '@/lib/specialties/colours'

type Props = {
  status: EntryStatus
  className?: string
}

// Renders a coloured-dot + status-name pill. Used on every case / portfolio row.
// The "overdue" dot pulses; non-colour state cue per a11y rule (dot animation +
// label text, not just the colour).
export default function StatusPill({ status, className }: Props) {
  const c = colourClasses(STATUS_COLOUR[status])
  const pulse = statusPulses(status) ? 'animate-pulse-dot' : ''
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded text-[11px] font-medium px-2 py-0.5 border ${c.bg} ${c.border} ${c.text} ${className ?? ''}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${pulse}`} />
      {STATUS_LABEL[status]}
    </span>
  )
}
