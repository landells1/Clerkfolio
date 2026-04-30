import { MonoLabel } from './mono-label'

type SectionHeaderProps = {
  number?: string
  label: string
  title: string
  sub?: string
}

export function SectionHeader({ label, title, sub }: SectionHeaderProps) {
  return (
    <div>
      <div className="mb-5">
        <MonoLabel>{label}</MonoLabel>
      </div>
      <h2 className="max-w-4xl text-[clamp(36px,4vw,56px)] font-medium leading-[1.02] tracking-[-0.04em] text-ink">
        {title}
      </h2>
      {sub ? <p className="mt-5 max-w-2xl text-lg leading-[1.5] text-ink-soft">{sub}</p> : null}
    </div>
  )
}
