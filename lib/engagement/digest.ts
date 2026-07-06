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

export type DigestPreferences = {
  weekly_digest?: boolean
  monthly_digest?: boolean
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

// A digest with zero entries is retention noise, not useful signal - never
// send one. (Both digest crons already pre-filter to users with activity in
// the window via a grouped query, so in practice this is a defence-in-depth
// check, not the primary filter - see fetchWindowEntriesByUser in each route.)
export function isDigestEmpty(summary: DigestSummary): boolean {
  return summary.entryCount === 0
}

// De-duplicates weekly vs monthly digest content (owner: "the weekly digest
// etc we send to users - it is too much"). A user with the weekly digest ON
// already gets this material every week, so the monthly recap is pure
// repetition; only send monthly to users who have weekly OFF. Unset
// (undefined) `weekly_digest` defaults to true (see notification settings
// page + DB default), so it counts as "weekly is on" here too.
export function shouldSendMonthlyDigest(prefs: DigestPreferences): boolean {
  const weeklyOn = prefs.weekly_digest !== false
  const monthlyOn = prefs.monthly_digest !== false
  return monthlyOn && !weeklyOn
}
