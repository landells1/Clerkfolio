import { MonoLabel } from './mono-label'

type SectionHeaderProps = {
  number: string
  label: string
  title: string
  sub?: string
}

export function SectionHeader({ number, label, title, sub }: SectionHeaderProps) {
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <MonoLabel>§ {number}</MonoLabel>
        <span className="h-px w-6 bg-white/[0.08]" aria-hidden />
        <MonoLabel>{label}</MonoLabel>
      </div>
      <h2 className="max-w-4xl text-[clamp(36px,4vw,56px)] font-medium leading-[1.02] tracking-[-0.04em] text-ink">
        {title}
      </h2>
      {sub ? <p className="mt-5 max-w-2xl text-lg leading-[1.5] text-ink-soft">{sub}</p> : null}
    </div>
  )
}
