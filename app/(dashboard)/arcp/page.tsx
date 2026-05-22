import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ARCPPageClient from '@/components/arcp/arcp-page-client'
import type { ARCPCapability, ARCPEntryLink } from '@/lib/types/arcp'
import { filterLinksToActivePortfolioEntries } from '@/lib/specialties/active-links'

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
  const activeLinks = await filterLinksToActivePortfolioEntries(
    supabase,
    (links ?? []) as ARCPEntryLink[]
  )

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">ARCP Evidence</h1>
        <p className="text-xs uppercase tracking-wider text-[rgba(245,245,242,0.4)] mt-1">
          Annual Review of Competency Progression
        </p>
        <p className="text-sm text-[rgba(245,245,242,0.55)] mt-2">
          Link portfolio entries to Foundation Programme capabilities to build evidence as you go.
          This is for your own organisation - it isn&apos;t a Horus replacement and doesn&apos;t replace
          the official portfolio your deanery requires.
        </p>
      </div>

      <details className="mb-6 rounded-2xl border border-white/[0.06] bg-[#141416] p-4">
        <summary className="cursor-pointer text-sm font-semibold text-[#F5F5F2]">
          What are capabilities?
        </summary>
        <p className="mt-3 text-sm text-[rgba(245,245,242,0.6)] leading-6">
          The Foundation Programme curriculum sets out 17 high-level capabilities (e.g. patient
          care, professional behaviour, leadership). At ARCP your supervisor wants to see evidence
          across all of them. Linking a portfolio entry here records that you think it demonstrates
          a particular capability - the same entry can support multiple capabilities. Click any row
          below to add or remove linked entries.
        </p>
      </details>

      <ARCPPageClient
        capabilities={(capabilities ?? []) as ARCPCapability[]}
        initialLinks={activeLinks}
      />
    </div>
  )
}
