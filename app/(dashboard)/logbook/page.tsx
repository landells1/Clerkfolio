import { createClient } from '@/lib/supabase/server'
import { LogbookPageClient } from '@/components/logbook/logbook-page-client'
import type { LogbookEntry } from '@/lib/types/logbook'

export default async function LogbookPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-[rgba(245,245,242,0.4)] text-sm">Please sign in to view your logbook.</p>
      </div>
    )
  }

  const [{ data: entries }, { data: applications }] = await Promise.all([
    supabase
      .from('logbook_entries')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('pinned', { ascending: false })
      .order('date', { ascending: false }),
    supabase
      .from('specialty_applications')
      .select('specialty_key')
      .eq('user_id', user.id),
  ])

  const trackedSpecialtyKeys = (applications ?? []).map(a => a.specialty_key)

  return (
    <LogbookPageClient
      entries={(entries ?? []) as LogbookEntry[]}
      trackedSpecialtyKeys={trackedSpecialtyKeys}
    />
  )
}
