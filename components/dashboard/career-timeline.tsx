const STAGES = [
  { key: 'Y1', label: 'Y1' },
  { key: 'Y2', label: 'Y2' },
  { key: 'Y3', label: 'Y3' },
  { key: 'Y4', label: 'Y4' },
  { key: 'Y5_PLUS', label: 'Y5+' },
  { key: 'FY1', label: 'FY1' },
  { key: 'FY2', label: 'FY2' },
  { key: 'POST_FY', label: 'ST3+' },
]

export default function CareerTimeline({ stage }: { stage: string | null | undefined }) {
  const activeIndex = Math.max(0, STAGES.findIndex(item => item.key === stage))
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
      <div className="mb-5">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Career timeline</p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">Current stage pin across training</p>
      </div>
      <div className="relative">
        <div className="absolute left-0 right-0 top-3 h-1 rounded-full bg-white/[0.08]" />
        <div className="absolute left-0 top-3 h-1 rounded-full bg-[var(--accent)]" style={{ width: `${(activeIndex / (STAGES.length - 1)) * 100}%` }} />
        <div className="relative grid" style={{ gridTemplateColumns: `repeat(${STAGES.length}, minmax(0, 1fr))` }}>
          {STAGES.map((item, index) => (
            <div key={item.key} className="flex flex-col items-center gap-2">
              <span className={`h-7 w-7 rounded-full border text-[10px] font-semibold leading-7 text-center ${
                index === activeIndex
                  ? 'border-[var(--accent)] bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]'
                  : index < activeIndex
                    ? 'border-[#1B6FD9]/45 bg-[#1B6FD9]/15 text-[var(--text-primary)]'
                    : 'border-white/[0.12] bg-[var(--bg-canvas)] text-[var(--text-muted)]'
              }`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
