import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { filterLinksToActivePortfolioEntries } from '@/lib/specialties/active-links'
import { calculateDomainScore, getSpecialtyConfig, getSelectionFamilyLabel, type SpecialtyApplication, type SpecialtyEntryLink } from '@/lib/specialties'

export default async function SpecialtyComparePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: applications } = await supabase
    .from('specialty_applications')
    .select('id, user_id, specialty_key, cycle_year, bonus_claimed, created_at, is_active, archived_at')
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  const apps = (applications ?? []) as SpecialtyApplication[]
  const appIds = apps.map(app => app.id)
  const { data: links } = appIds.length
    ? await supabase
      .from('specialty_entry_links')
      .select('id, application_id, domain_key, entry_id, entry_type, band_label, points_claimed, is_checkbox, created_at')
      .in('application_id', appIds)
    : { data: [] as SpecialtyEntryLink[] }
  const linkRows = await filterLinksToActivePortfolioEntries(
    supabase,
    (links ?? []) as SpecialtyEntryLink[]
  )
  const configs = apps.map(app => ({ app, config: getSpecialtyConfig(app.specialty_key) })).filter(item => item.config)
  // Count how many of the compared specialties include each domain label, then
  // keep only labels shared by 2+ of them. Every specialty has its own unique
  // scoring criteria, so unioning all labels produced a long tail of rows where
  // every other column was just "-" (compare-table sprawl); a side-by-side is
  // only meaningful on the dimensions the specialties actually have in common.
  // Presentation-only: the configs and scoring math are untouched.
  const orderedLabels = Array.from(new Set(configs.flatMap(item => item.config!.domains.map(domain => domain.label))))
  const labelCounts = new Map<string, number>()
  configs.forEach(item => {
    new Set(item.config!.domains.map(domain => domain.label)).forEach(label => {
      labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1)
    })
  })
  const domainLabels = orderedLabels.filter(label => (labelCounts.get(label) ?? 0) >= 2)

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-8">
      <div className="mb-6">
        <Link href="/specialties" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">Specialties</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Specialty comparison</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Side-by-side view of your own linked evidence and claimed scoring.</p>
      </div>
      {configs.length < 2 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-8 text-sm text-[var(--text-muted)]">Track at least two active specialties to compare them.</div>
      ) : domainLabels.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-8 text-sm text-[var(--text-muted)]">These specialties don&apos;t share any scoring criteria, so there&apos;s nothing to line up side by side. Open each specialty from the list to see its own scoring.</div>
      ) : (
        <>
        <p className="mb-3 text-xs text-[var(--text-muted)]">Showing criteria shared by two or more of these specialties. Each specialty also has its own criteria - open it from the list to see them.</p>
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)]">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="border-b border-white/[0.08] text-xs text-[var(--text-muted)]">
              <tr>
                <th className="p-3">Domain</th>
                {configs.map(({ app, config }) => (
                  <th key={app.id} className="p-3">
                    {config!.name}
                    {config!.selectionProcess && (
                      <p className="mt-0.5 text-[10px] font-normal normal-case text-[var(--text-muted)]">
                        {getSelectionFamilyLabel(config!.selectionProcess.family)}
                      </p>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {domainLabels.map(label => (
                <tr key={label}>
                  <td className="p-3 text-[var(--text-secondary)]">{label}</td>
                  {configs.map(({ app, config }) => {
                    const domain = config!.domains.find(item => item.label === label)
                    if (!domain) return <td key={app.id} className="p-3 text-[var(--text-secondary)]">-</td>
                    const domainLinks = linkRows.filter(link => link.application_id === app.id && link.domain_key === domain.key)
                    const score = calculateDomainScore(domain, domainLinks)
                    const target = Math.ceil(domain.maxPoints * 0.75)
                    return (
                      <td key={app.id} className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-white/[0.08]">
                            <div className="h-full bg-[var(--accent)]" style={{ width: `${domain.maxPoints ? Math.min(100, (score / domain.maxPoints) * 100) : domainLinks.length ? 100 : 0}%` }} />
                          </div>
                          <span className="text-xs text-[var(--text-primary)]">{domainLinks.length} links</span>
                          {!domain.isEvidenceOnly && <span className="text-xs text-[var(--text-muted)]">{score}/{domain.maxPoints} target {target}</span>}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  )
}
