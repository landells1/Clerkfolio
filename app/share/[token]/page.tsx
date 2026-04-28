import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSpecialtyConfig, isEvidenceBased, getEssentialDomains, getDesirableDomains } from '@/lib/specialties'
import type { SpecialtyEntryLink } from '@/lib/specialties'

export const dynamic = 'force-dynamic'

type Entry = { id: string; title: string; date: string; type: 'portfolio' | 'case'; category?: string }

async function resolveEntries(
  supabase: ReturnType<typeof createClient>,
  links: SpecialtyEntryLink[]
): Promise<Entry[]> {
  const portfolioIds = links.filter(l => l.entry_type === 'portfolio' && l.entry_id).map(l => l.entry_id!)
  const caseIds = links.filter(l => l.entry_type === 'case' && l.entry_id).map(l => l.entry_id!)

  const [portfolioRes, caseRes] = await Promise.all([
    portfolioIds.length > 0
      ? supabase.from('portfolio_entries').select('id, title, date, category').in('id', portfolioIds)
      : Promise.resolve({ data: [] }),
    caseIds.length > 0
      ? supabase.from('cases').select('id, title, date').in('id', caseIds)
      : Promise.resolve({ data: [] }),
  ])

  return [
    ...((portfolioRes.data ?? []).map(e => ({ ...e, type: 'portfolio' as const }))),
    ...((caseRes.data ?? []).map(e => ({ ...e, type: 'case' as const }))),
  ]
}

export default async function SharePage({ params }: { params: { token: string } }) {
  const supabase = createClient()

  // Look up token — no auth required; token is the secret
  const { data: shareLink } = await supabase
    .from('share_links')
    .select('*')
    .eq('token', params.token)
    .eq('revoked', false)
    .single()

  if (!shareLink) notFound()

  // Check expiry
  if (new Date(shareLink.expires_at) < new Date()) notFound()

  const specialty_key: string = shareLink.specialty_key
  const config = getSpecialtyConfig(specialty_key)
  if (!config) notFound()

  // Fetch the specialty application for this user + key
  const { data: application } = await supabase
    .from('specialty_applications')
    .select('*')
    .eq('user_id', shareLink.user_id)
    .eq('specialty_key', specialty_key)
    .single()

  if (!application) notFound()

  // Fetch evidence links
  const { data: linkData } = await supabase
    .from('specialty_entry_links')
    .select('*')
    .eq('application_id', application.id)
    .order('created_at', { ascending: true })

  const links: SpecialtyEntryLink[] = (linkData ?? []) as SpecialtyEntryLink[]
  const entries = await resolveEntries(supabase, links)

  const evidenceBased = isEvidenceBased(config)
  const domains = evidenceBased
    ? [...getEssentialDomains(config), ...getDesirableDomains(config)]
    : config.domains

  const expiresFormatted = new Date(shareLink.expires_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-[#F5F5F2]">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3884DD 0%, #155BB0 100%)' }}>
              <svg viewBox="0 0 64 64" width="14" height="14" fill="none">
                <rect x="8" y="32" width="9" height="24" rx="1.6" fill="#0A3260" fillOpacity="0.85" />
                <rect x="20" y="26" width="9" height="30" rx="1.6" fill="#0A3260" fillOpacity="0.9" />
                <rect x="32" y="20" width="9" height="36" rx="1.6" fill="#0A3260" fillOpacity="0.95" />
                <rect x="44" y="12" width="14" height="44" rx="2.4" fill="#EAF2FC" />
                <path d="M48 34 L52 38 L56 28" stroke="#155BB0" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight">Clinidex</span>
          </div>
          <p className="text-xs text-[rgba(245,245,242,0.3)]">Read-only · Expires {expiresFormatted}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold tracking-tight">{config.name}</h1>
            <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-[rgba(245,245,242,0.45)] text-sm font-medium">{config.cycleYear}</span>
            {config.isOfficial && (
              <span className="px-2 py-0.5 rounded-md bg-[#1B6FD9]/10 text-[#1B6FD9] text-xs font-medium border border-[#1B6FD9]/20">Official</span>
            )}
          </div>
          <p className="text-sm text-[rgba(245,245,242,0.45)]">
            {domains.length} domain{domains.length !== 1 ? 's' : ''} · {links.length} piece{links.length !== 1 ? 's' : ''} of evidence linked
          </p>
        </div>

        {/* Domain list */}
        <div className="space-y-3">
          {domains.map(domain => {
            const domainLinks = links.filter(l => l.domain_key === domain.key)
            const domainEntries = entries.filter(e => domainLinks.some(l => l.entry_id === e.id))

            return (
              <div key={domain.key} className="bg-[#141416] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${domainLinks.length > 0 ? 'bg-emerald-400' : 'bg-white/[0.12]'}`} />
                    <p className="text-sm font-medium text-[#F5F5F2]">{domain.label}</p>
                    {domain.criteriaType && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                        domain.criteriaType === 'essential'
                          ? 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                          : 'bg-white/[0.06] text-[rgba(245,245,242,0.45)] border-white/[0.08]'
                      }`}>
                        {domain.criteriaType}
                      </span>
                    )}
                  </div>
                  {!evidenceBased && domainLinks.length > 0 && (
                    <span className="text-xs text-[rgba(245,245,242,0.4)] font-mono">
                      {domainLinks.reduce((s, l) => s + l.points_claimed, 0)} / {domain.maxPoints} pts
                    </span>
                  )}
                </div>

                {domainEntries.length > 0 ? (
                  <div className="divide-y divide-white/[0.04]">
                    {domainEntries.map(entry => {
                      const link = domainLinks.find(l => l.entry_id === entry.id)
                      return (
                        <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/[0.06] text-[rgba(245,245,242,0.45)] border border-white/[0.08] shrink-0 capitalize">
                            {entry.type}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[rgba(245,245,242,0.8)] truncate">{entry.title}</p>
                            <p className="text-[10px] text-[rgba(245,245,242,0.3)] font-mono mt-0.5">
                              {new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          {link && !evidenceBased && link.band_label && (
                            <span className="text-xs text-[rgba(245,245,242,0.4)] shrink-0 font-mono">{link.band_label}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="px-4 py-2.5 text-xs text-[rgba(245,245,242,0.3)] italic">No evidence linked</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.06] py-6 mt-10">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-xs text-[rgba(245,245,242,0.25)] text-center">
            Shared via{' '}
            <a href="https://clinidex.co.uk" className="hover:text-[rgba(245,245,242,0.5)] transition-colors">
              Clinidex
            </a>
            {' '}· Medical portfolio tracker for UK doctors
          </p>
        </div>
      </div>
    </div>
  )
}
