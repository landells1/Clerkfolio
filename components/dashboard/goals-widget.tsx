import Link from 'next/link'

type Goal = {
  id: string
  category: string
  target_count: number
  due_date?: string | null
}

type Props = {
  goals: Goal[]
  catMap: Record<string, number>
  totalCases: number
}

export default function GoalsWidget({ goals, catMap, totalCases }: Props) {
  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-[#F5F5F2]">Goals</p>
        <Link href="/goals" className="text-xs text-[#1B6FD9] hover:text-[#3884DD] transition-colors">
          Edit →
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
            const current = goal.category === 'case' ? totalCases : (catMap[goal.category] ?? 0)
            const pct = Math.min(Math.round((current / goal.target_count) * 100), 100)
            const complete = current >= goal.target_count

            return (
              <div key={goal.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[rgba(245,245,242,0.7)] capitalize">
                    {goal.category === 'case' ? 'Cases' : goal.category.replace('_', ' ')}
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
