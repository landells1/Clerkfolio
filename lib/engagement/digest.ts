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
  return {
    entryCount: entries.length,
    green: entries.filter(entry => (entry.completeness_score ?? 0) >= 80).length,
    amber: entries.filter(entry => (entry.completeness_score ?? 0) >= 50 && (entry.completeness_score ?? 0) < 80).length,
    red: entries.filter(entry => (entry.completeness_score ?? 0) < 50).length,
    specialtyTags,
    currentStreak: currentStreakFromActiveWeeks(activeWeeks),
    activeWeeksYtd: activeWeeksYearToDate(activeWeeks),
  }
}
