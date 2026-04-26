import Link from 'next/link'

type Goal = {
  id: string
  category: string
  target_count: number
  due_date?: string | null
  start_date?: string | null
}

type Props = {
  goals: Goal[]
  portfolioEntries: { category: string; created_at: string }[]
  caseEntries: { created_at: string }[]
  accountCreatedAt: string
}

const LABEL: Record<string, string> = {
  audit_qip: 'Audit & QIP', teaching: 'Teaching', conference: 'Conference',
  publication: 'Publication', leadership: 'Leadership', prize: 'Prize',
  procedure: 'Procedure', reflection: 'Reflection', case: 'Cases',
}

function countForGoal(
  goal: Goal,
  entries: { category: string; created_at: string }[],
  cases: { created_at: string }[],
  accountCreatedAt: string
): number {
  const from = goal.start_date ?? accountCreatedAt.split('T')[0]
  if (goal.category === 'case') {
    return cases.filter(c => c.created_at.split('T')[0] >= from).length
  }
  return entries.filter(e => e.category === goal.category && e.created_at.split('T')[0] >= from).length
}

export default function GoalsWidget({ goals, portfolioEntries, caseEntries, accountCreatedAt }: Props) {
  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <Link href="/goals" className="text-sm font-semibold text-[#F5F5F2] hover:text-[rgba(245,245,242,0.7)] transition-colors">
          Goals
        </Link>
        <Link href="/goals" className="text-xs text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors">
          View all →
        </Link>
      </div>

      {goals.length === 0 ? (
        <p className="text-xs text-[rgba(245,245,242,0.4)]">
          No goals set.{' '}
          <Link href="/goals" className="text-[#1B6FD9] hover:underline">
            Set a goal →
          </Link>
        </p>
      ) : (
        <div className="space-y-3">
          {goals.map(goal => {
            const current = countForGoal(goal, portfolioEntries, caseEntries, accountCreatedAt)
            const pct = Math.min(Math.round((current / goal.target_count) * 100), 100)
            const complete = current >= goal.target_count

            return (
              <div key={goal.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[rgba(245,245,242,0.7)]">
                    {LABEL[goal.category] ?? goal.category}
                  </span>
                  <span className="text-xs text-[rgba(245,245,242,0.4)]">{current}/{goal.target_count}</span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${complete ? 'bg-[#1B6FD9]' : 'bg-[#1B6FD9]/60'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
