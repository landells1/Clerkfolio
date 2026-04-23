// Server component — no 'use client'

interface StreakBadgeProps {
  streak: number
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak === 0) {
    return (
      <span className="text-xs text-[rgba(245,245,242,0.35)]">
        Log this week to start a streak
      </span>
    )
  }

  const onFire = streak >= 4
  const label = onFire ? 'week streak — on fire 🔥' : 'week streak'

  return (
    <div className="flex items-center gap-1.5">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={onFire ? 'text-amber-400' : 'text-[#1D9E75]'}
      >
        <path d="M12 2C9 7 6 9.5 6 14a6 6 0 0 0 12 0c0-3-1.5-5.5-3-7-0.5 2-1.5 3-2 3-1 0-1.5-2-1-4z" />
      </svg>
      <div className="flex flex-col leading-none">
        <span className="text-2xl font-bold text-[#F5F5F2] leading-none">{streak}</span>
        <span className="text-xs text-[rgba(245,245,242,0.4)] mt-0.5">{label}</span>
      </div>
    </div>
  )
}
