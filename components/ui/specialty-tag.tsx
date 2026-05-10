import { formatSpecialtyLabel } from '@/lib/specialties'
import { getSpecialtyColour, colourClasses, type PillColour } from '@/lib/specialties/colours'

type Size = 'sm' | 'md'

type Props = {
  specialty: string | null | undefined
  size?: Size
  // Override the auto-derived colour. Useful for non-specialty tags using the same visual.
  colour?: PillColour
  // Override the auto-derived label.
  label?: string
  className?: string
}

export default function SpecialtyTag({ specialty, size = 'sm', colour, label, className }: Props) {
  const c = colourClasses(colour ?? getSpecialtyColour(specialty))
  const text = label ?? formatSpecialtyLabel(specialty)
  const sizing = size === 'sm'
    ? 'text-[11px] px-2 py-0.5 gap-1.5'
    : 'text-xs px-2.5 py-1 gap-2'
  return (
    <span
      className={`inline-flex items-center rounded font-medium border ${c.bg} ${c.border} ${c.text} ${sizing} ${className ?? ''}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {text}
    </span>
  )
}
