const rows = [
  ['☑', 'QIP completed', true],
  ['☑', 'Audit, closed loop', true],
  ['☐', 'Teaching qualification', false],
  ['☑', 'Publication, first author', true],
] as const

export function FloatingChecklistCard() {
  return (
    <div className="w-[250px] -rotate-[3deg] rounded-xl border border-white/[0.15] bg-[#141416] p-3.5 shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
      <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.14em] text-accent">IMT 2027 · 5 / 8 domains</div>
      <div className="space-y-2">
        {rows.map(([box, label, done]) => (
          <div key={label} className={`text-xs ${done ? 'text-ink-soft line-through' : 'text-ink'}`}>
            <span className="mr-2 font-mono text-accent">{box}</span>{label}
          </div>
        ))}
      </div>
    </div>
  )
}
