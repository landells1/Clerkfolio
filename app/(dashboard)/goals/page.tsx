import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import GoalsManager from '@/components/goals/goals-manager'

export default async function GoalsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: goals },
    { data: portfolioEntries },
    { data: caseEntries },
  ] = await Promise.all([
    supabase
      .from('goals')
      .select('id, category, target_count, due_date, start_date')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('portfolio_entries')
      .select('category, created_at')
      .eq('user_id', user!.id)
      .is('deleted_at', null),
    supabase
      .from('cases')
      .select('created_at')
      .eq('user_id', user!.id)
      .is('deleted_at', null),
  ])

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] text-sm mb-4 inline-flex items-center gap-1 transition-colors"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight mt-2">Goals</h1>
        <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">
          Set targets for each part of your portfolio. Progress only counts entries logged on or after each goal&apos;s start date.
        </p>
      </div>
      <GoalsManager
        initialGoals={goals ?? []}
        portfolioEntries={portfolioEntries ?? []}
        caseEntries={caseEntries ?? []}
        accountCreatedAt={user!.created_at}
      />
    </div>
  )
}
