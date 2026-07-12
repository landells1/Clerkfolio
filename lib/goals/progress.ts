export type GoalProgressGoal = {
  category: string
  start_date: string | null
}

export type GoalProgressEntry = {
  category: string
  date: string
  is_demo?: boolean | null
  deleted_at?: string | null
}

/**
 * Counts how many real portfolio entries count toward a goal: same
 * category, logged on or after the goal's start_date. Neutral progress
 * count only - never a readiness/pace judgement (owner red-line).
 *
 * Date bound: entry.date >= start_date, with NO upper bound against
 * due_date. Logging toward a goal after its due date is still genuine
 * progress on that goal, so an entry is not excluded just because it lands
 * after due_date - callers show "N of target logged" regardless of timing.
 * A goal with no start_date (nullable in the DB) counts every matching
 * entry ever logged, category-only.
 *
 * Demo rows and soft-deleted entries never count. Callers are expected to
 * pass already demo-excluded, non-deleted entries (mirrors the dashboard's
 * `realEntries` pattern - see app/(dashboard)/dashboard/page.tsx), but the
 * is_demo/deleted_at checks here are a defensive second guard so a caller
 * that forgets to pre-filter still gets a correct count.
 */
export function countGoalProgress(goal: GoalProgressGoal, entries: GoalProgressEntry[]): number {
  return entries.filter(entry => {
    if (entry.is_demo) return false
    if (entry.deleted_at) return false
    if (entry.category !== goal.category) return false
    if (goal.start_date && entry.date < goal.start_date) return false
    return true
  }).length
}

export type GoalWithProgress<G extends GoalProgressGoal> = G & { loggedCount: number }

/** Batch helper: attaches a `loggedCount` to each goal via countGoalProgress. */
export function buildGoalProgress<G extends GoalProgressGoal>(
  goals: G[],
  entries: GoalProgressEntry[]
): GoalWithProgress<G>[] {
  return goals.map(goal => ({ ...goal, loggedCount: countGoalProgress(goal, entries) }))
}
