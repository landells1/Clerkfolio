import { createClient } from '@/lib/supabase/server'
import DeadlinesPageClient from '@/components/deadlines/deadlines-page-client'

export default async function DeadlinesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: upcoming } = await supabase
    .from('deadlines')
    .select('*')
    .eq('user_id', user!.id)
    .eq('completed', false)
    .order('due_date', { ascending: true })

  const { data: completed } = await supabase
    .from('deadlines')
    .select('*')
    .eq('user_id', user!.id)
    .eq('completed', true)
    .order('due_date', { ascending: false })
    .limit(20)

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Deadlines</h1>
        <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">
          Track application deadlines, portfolio submissions and exam dates
        </p>
      </div>

      <DeadlinesPageClient
        initialUpcoming={upcoming ?? []}
        initialCompleted={completed ?? []}
      />
    </div>
  )
}
