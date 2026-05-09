import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ARCPPageClient from '@/components/arcp/arcp-page-client'
import type { ARCPCapability, ARCPEntryLink } from '@/lib/types/arcp'

// Mirror the sidebar visibility rule (FY1/FY2 only). The sidebar already
// hides this nav item, but a deep link or a stale tab can still land here.
const ARCP_VISIBLE_STAGES = new Set(['FY1', 'FY2'])

export default async function ARCPPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('career_stage')
    .eq('id', user!.id)
    .maybeSingle()

  if (!ARCP_VISIBLE_STAGES.has(profile?.career_stage ?? '')) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="rounded-2xl border border-white/[0.08] bg-[#141416] p-8">
          <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">ARCP not available</h1>
          <p className="mt-2 text-sm text-[rgba(245,245,242,0.55)]">
            ARCP capability tracking is for Foundation Year 1 and Year 2 doctors. Update your career
            stage in <Link href="/settings" className="text-[#1B6FD9] hover:underline">Settings</Link> if
            this is wrong.
          </p>
        </div>
      </div>
    )
  }

  const [{ data: capabilities }, { data: links }] = await Promise.all([
    supabase
      .from('arcp_capabilities')
      .select('*')
      .order('sort_order', { ascending: true }),
    supabase
      .from('arcp_entry_links')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: true }),
  ])

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">ARCP Evidence</h1>
        <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">
          Link your portfolio entries to Foundation Programme curriculum capabilities.
        </p>
      </div>

      <ARCPPageClient
        capabilities={(capabilities ?? []) as ARCPCapability[]}
        initialLinks={(links ?? []) as ARCPEntryLink[]}
      />
    </div>
  )
}
