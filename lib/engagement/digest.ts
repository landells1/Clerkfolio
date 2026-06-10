import { activeWeeksYearToDate, currentStreakFromActiveWeeks } from '@/lib/engagement/streaks'

export type DigestEntry = {
  specialty_tags?: string[] | null
  completeness_score?: number | null
}

export type DigestSummary = {
  entryCount: number
  green: number
  amber: number
  red: number
  specialtyTags: string[]
  currentStreak: number
  activeWeeksYtd: number
}

export function buildDigestSummary(entries: DigestEntry[], activeWeeks: string[] = []): DigestSummary {
  const specialtyTags = Array.from(new Set(entries.flatMap(entry => entry.specialty_tags ?? []))).sort()
  // completeness_score is stored on the 0-2 scale from lib/utils/completeness
  // (0 = red, 1 = amber, 2 = green) - not a percentage. Percent-style
  // thresholds here once classified every entry as red in live digest emails.
  return {
    entryCount: entries.length,
    green: entries.filter(entry => (entry.completeness_score ?? 0) >= 2).length,
    amber: entries.filter(entry => (entry.completeness_score ?? 0) === 1).length,
    red: entries.filter(entry => (entry.completeness_score ?? 0) < 1).length,
    specialtyTags,
    currentStreak: currentStreakFromActiveWeeks(activeWeeks),
    activeWeeksYtd: activeWeeksYearToDate(activeWeeks),
  }
}
