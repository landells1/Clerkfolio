import { activeWeeksYearToDate, currentStreakFromActiveWeeks } from '@/lib/engagement/streaks'

export type DigestEntry = {
  specialty_tags?: string[] | null
}

export type DigestSummary = {
  entryCount: number
  specialtyTags: string[]
  currentStreak: number
  activeWeeksYtd: number
}

// The completeness "green/amber/red mix" line was removed from digests pre-launch
// (Batch 3 / F-016) along with the auto completeness signal it summarised.
export function buildDigestSummary(entries: DigestEntry[], activeWeeks: string[] = []): DigestSummary {
  const specialtyTags = Array.from(new Set(entries.flatMap(entry => entry.specialty_tags ?? []))).sort()
  return {
    entryCount: entries.length,
    specialtyTags,
    currentStreak: currentStreakFromActiveWeeks(activeWeeks),
    activeWeeksYtd: activeWeeksYearToDate(activeWeeks),
  }
}
