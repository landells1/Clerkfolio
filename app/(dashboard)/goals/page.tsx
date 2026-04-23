import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import GoalsManager from '@/components/goals/goals-manager'

export default async function GoalsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: goals } = await supabase
    .from('goals')
    .select('id, category, target_count')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: true })

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
        <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">Set targets for each part of your portfolio.</p>
      </div>
      <GoalsManager initialGoals={goals ?? []} />
    </div>
  )
}
