export default function EmptyDayPrompt() {
  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#1B6FD9]/20 bg-[#1B6FD9]/[0.06] px-4 py-3">
      <span className="shrink-0 text-[var(--accent-text)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </span>
      <p className="text-sm text-[var(--text-secondary)]">
        Nothing logged today - use <span className="text-[var(--text-primary)] font-medium">Quick log</span> to add something in 30 seconds.
      </p>
    </div>
  )
}
