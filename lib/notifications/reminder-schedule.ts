import { londonDateKey } from '@/lib/engagement/streaks'

// When the daily notifications cron sends each reminder. Previously a reminder
// fired EVERY day an item sat inside its window (the duplicate check only
// looked at today's notifications), so four expiring training modules meant
// an email a day for 30 days. Each item now fires on a few milestone days.
export const DEADLINE_REMINDER_DAYS = [3, 1, 0] as const
export const EXPIRY_REMINDER_DAYS = [30, 7, 1, 0] as const // verification + training
export const SHARE_EXPIRY_REMINDER_DAYS = [3, 1] as const
export const ACTIVITY_NUDGE_INTERVAL_DAYS = 7

/** Whole UK calendar days from `now` until `target` (a date or timestamp). */
export function ukDaysUntil(target: string, now: Date = new Date()): number {
  const toUtcMidnight = (key: string) => {
    const [y, m, d] = key.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  const targetKey = /^\d{4}-\d{2}-\d{2}$/.test(target) ? target : londonDateKey(target)
  return Math.round((toUtcMidnight(targetKey) - toUtcMidnight(londonDateKey(now))) / 86_400_000)
}

export function isReminderDay(daysLeft: number, milestones: readonly number[]): boolean {
  return milestones.includes(daysLeft)
}
