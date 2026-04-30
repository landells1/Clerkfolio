import { Logo } from '../logo'

const items = [
  ['Dashboard', '◉'],
  ['Portfolio', '▤'],
  ['Cases', '◐'],
  ['Specialties', '◇'],
  ['ARCP', '✓'],
  ['Timeline', '⌗'],
  ['Export & share', '↗'],
] as const

export function MockSidebar({ active }: { active: string }) {
  return (
    <aside className="flex w-[168px] shrink-0 flex-col border-r border-white/[0.08] bg-[#0E0E10] px-2 py-3.5 max-sm:hidden">
      <div className="mb-5 flex items-center gap-2 px-1.5">
        <Logo />
        <span className="text-sm font-medium tracking-[-0.02em]">Clerkfolio</span>
      </div>
      <div className="space-y-1">
        {items.map(([label, glyph]) => {
          const isActive = label === active
          return (
            <div
              key={label}
              className={`flex items-center gap-2 rounded-md border px-2 py-2 text-[12px] ${
                isActive
                  ? 'border-white/[0.08] bg-[#141416] text-ink'
                  : 'border-transparent text-ink-soft'
              }`}
            >
              <span className={isActive ? 'font-mono text-accent' : 'font-mono text-ink-dim'}>{glyph}</span>
              <span className="truncate">{label}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-auto px-2 pt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-dim">Free plan</div>
    </aside>
  )
}
