'use client'

import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'
import type { SpecialtyDomain, SpecialtyEntryLink } from '@/lib/specialties'

type Props = {
  domain: SpecialtyDomain
  links: SpecialtyEntryLink[]
  onRemove: (linkId: string) => void
}

export function DomainEvidenceList({ domain, links, onRemove }: Props) {
  const supabase = createClient()
  const { addToast } = useToast()

  async function handleRemove(linkId: string) {
    const { error } = await supabase.from('specialty_entry_links').delete().eq('id', linkId)
    if (error) {
      addToast('Failed to remove evidence. Please try again.', 'error')
      return
    }
    onRemove(linkId) // update UI only after confirmed DB delete
  }

  // Evidence-only domains have no scoring - suppress points labels and counting indicators.
  const isEvidenceOnly = !!domain.isEvidenceOnly || domain.maxPoints === 0

  const sorted =
    !isEvidenceOnly && domain.scoringRule === 'highest'
      ? [...links].sort((a, b) => b.points_claimed - a.points_claimed)
      : links

  const highestPoints = !isEvidenceOnly && domain.scoringRule === 'highest' && sorted.length > 0
    ? sorted[0].points_claimed
    : -Infinity

  const totalPoints = links.reduce((s, l) => s + l.points_claimed, 0)
  const cappedTotal = Math.min(totalPoints, domain.maxPoints)

  return (
    <div>
      <p className="text-xs text-[var(--text-emphasis)] font-medium uppercase tracking-wide mb-2">
        {isEvidenceOnly ? 'Linked evidence' : 'Claimed & linked evidence'}
      </p>
      <div className="space-y-2">
        {sorted.map(link => {
          const isCounting = !isEvidenceOnly && domain.scoringRule === 'highest' && link.points_claimed === highestPoints
          const isClaimed = link.is_checkbox && !link.entry_type

          return (
            <div
              key={link.id}
              className={`relative flex items-start gap-3 p-3 rounded-xl border transition-all ${
                isCounting
                  ? 'border-l-2 border-l-[var(--accent)] border-t-white/[0.08] border-r-white/[0.08] border-b-white/[0.08] bg-accent/[0.05]'
                  : 'border-white/[0.06] bg-white/[0.02]'
              }`}
            >
              <span className="shrink-0 text-base leading-none mt-0.5">
                {isClaimed ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ stroke: isCounting ? 'var(--accent)' : 'var(--text-muted)' }} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : link.entry_type ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ stroke: isCounting ? 'var(--accent)' : 'var(--text-muted)' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                ) : null}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium leading-snug ${isCounting ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                    {link.band_label}
                  </span>
                  {!isEvidenceOnly && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        isCounting
                          ? 'bg-accent/20 text-[var(--accent-text)]'
                          : 'bg-white/[0.06] text-[var(--text-muted)]'
                      }`}
                    >
                      {link.points_claimed} pts
                    </span>
                  )}
                  {isClaimed ? (
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[var(--text-secondary)] text-xs">
                      Self-claimed
                    </span>
                  ) : link.entry_type ? (
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[var(--text-secondary)] text-xs capitalize">
                      {link.entry_type}
                    </span>
                  ) : null}
                  {!isClaimed && link.entry_id && link.entry_type && (
                    <a
                      href={`/portfolio/${link.entry_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--accent-text)] hover:underline"
                    >
                      View
                    </a>
                  )}
                </div>
                {!isEvidenceOnly && domain.scoringRule === 'highest' && (
                  <p className={`text-xs mt-0.5 ${isCounting ? 'text-[var(--accent-text)]' : 'text-[var(--text-secondary)]'}`}>
                    {isCounting ? 'Counting' : 'Not counting (lower score)'}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleRemove(link.id)}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 transition-all"
                aria-label="Remove link"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>

      {!isEvidenceOnly && domain.scoringRule === 'cumulative_capped' && links.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">Total (capped at {domain.maxPoints} pts)</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {cappedTotal} / {domain.maxPoints} pts
          </span>
        </div>
      )}
    </div>
  )
}
