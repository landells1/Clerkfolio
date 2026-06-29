// Server component - no 'use client'

import { activeWeeksYearToDate, currentStreakFromActiveWeeks } from '@/lib/engagement/streaks'

interface StreakBadgeProps {
  streak?: number
  activeWeeks?: string[]
}

export default function StreakBadge({ streak, activeWeeks = [] }: StreakBadgeProps) {
  const currentStreak = streak ?? currentStreakFromActiveWeeks(activeWeeks)
  const activeWeeksThisYear = activeWeeksYearToDate(activeWeeks)

  if (currentStreak === 0) {
    return (
      <div className="text-xs text-[var(--text-secondary)]">
        <p>Log this week to start a streak</p>
        {activeWeeks.length > 0 && <p className="mt-1">{activeWeeksThisYear} active weeks this year</p>}
      </div>
    )
  }

  const onFire = currentStreak >= 4

  return (
    <div className="flex items-center gap-1.5">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={onFire ? 'text-amber-400' : 'text-blue-400'}
      >
        <path d="M12 2C9 7 6 9.5 6 14a6 6 0 0 0 12 0c0-3-1.5-5.5-3-7-0.5 2-1.5 3-2 3-1 0-1.5-2-1-4z" />
      </svg>
      <div className="flex flex-col leading-none">
        <span className="text-2xl font-bold leading-none text-[var(--text-primary)]">{currentStreak}</span>
        <span className={`mt-0.5 text-xs ${onFire ? 'text-amber-400/70' : 'text-[var(--text-muted)]'}`}>wk streak</span>
        <span className="mt-1 text-[10px] text-[var(--text-secondary)]">{activeWeeksThisYear} active weeks YTD</span>
      </div>
    </div>
  )
}
