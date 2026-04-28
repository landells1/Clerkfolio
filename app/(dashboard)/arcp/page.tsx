import { createClient } from '@/lib/supabase/server'
import ARCPPageClient from '@/components/arcp/arcp-page-client'
import type { ARCPCapability, ARCPEntryLink } from '@/lib/types/arcp'

export default async function ARCPPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
    <div className="p-8 max-w-3xl">
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
