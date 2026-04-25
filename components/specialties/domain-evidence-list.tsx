'use client'

import { createClient } from '@/lib/supabase/client'
import type { SpecialtyDomain, SpecialtyEntryLink } from '@/lib/specialties'

type Props = {
  domain: SpecialtyDomain
  links: SpecialtyEntryLink[]
  onRemove: (linkId: string) => void
}

export function DomainEvidenceList({ domain, links, onRemove }: Props) {
  const supabase = createClient()

  async function handleRemove(linkId: string) {
    const { error } = await supabase.from('specialty_entry_links').delete().eq('id', linkId)
    if (error) {
      alert('Failed to remove evidence. Please try again.')
      return
    }
    onRemove(linkId) // update UI only after confirmed DB delete
  }

  const sorted =
    domain.scoringRule === 'highest'
      ? [...links].sort((a, b) => b.points_claimed - a.points_claimed)
      : links

  const highestPoints = domain.scoringRule === 'highest' && sorted.length > 0
    ? sorted[0].points_claimed
    : -Infinity

  const totalPoints = links.reduce((s, l) => s + l.points_claimed, 0)
  const cappedTotal = Math.min(totalPoints, domain.maxPoints)

  return (
    <div>
      <p className="text-xs text-[rgba(245,245,242,0.4)] font-medium uppercase tracking-wide mb-2">Claimed &amp; linked evidence</p>
      <div className="space-y-2">
        {sorted.map(link => {
          const isCounting = domain.scoringRule === 'highest' && link.points_claimed === highestPoints
          const isClaimed = link.is_checkbox && !link.entry_type
          const entryIcon = link.entry_type === 'case' ? '💼' : '📄'

          return (
            <div
              key={link.id}
              className={`relative flex items-start gap-3 p-3 rounded-xl border transition-all ${
                isCounting && domain.scoringRule === 'highest'
                  ? 'border-l-2 border-l-[#1B6FD9] border-t-white/[0.08] border-r-white/[0.08] border-b-white/[0.08] bg-[#1B6FD9]/[0.05]'
                  : 'border-white/[0.06] bg-white/[0.02]'
              }`}
            >
              <span className="shrink-0 text-base leading-none mt-0.5">
                {isClaimed ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isCounting ? '#1B6FD9' : 'rgba(245,245,242,0.3)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : link.entry_type ? entryIcon : null}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium leading-snug ${isCounting && domain.scoringRule === 'highest' ? 'text-[#F5F5F2]' : 'text-[rgba(245,245,242,0.55)]'}`}>
                    {link.band_label}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      isCounting && domain.scoringRule === 'highest'
                        ? 'bg-[#1B6FD9]/20 text-[#1B6FD9]'
                        : 'bg-white/[0.06] text-[rgba(245,245,242,0.4)]'
                    }`}
                  >
                    {link.points_claimed} pts
                  </span>
                  {isClaimed ? (
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[rgba(245,245,242,0.3)] text-xs">
                      Self-claimed
                    </span>
                  ) : link.entry_type ? (
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[rgba(245,245,242,0.35)] text-xs capitalize">
                      {link.entry_type}
                    </span>
                  ) : null}
                </div>
                {domain.scoringRule === 'highest' && (
                  <p className={`text-xs mt-0.5 ${isCounting ? 'text-[#1B6FD9]' : 'text-[rgba(245,245,242,0.3)]'}`}>
                    {isCounting ? '✓ Counting' : 'Not counting (lower score)'}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleRemove(link.id)}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-[rgba(245,245,242,0.3)] hover:text-red-400 hover:bg-red-500/10 transition-all"
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

      {domain.scoringRule === 'cumulative_capped' && links.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-xs text-[rgba(245,245,242,0.4)]">Total (capped at {domain.maxPoints} pts)</span>
          <span className="text-sm font-semibold text-[#F5F5F2]">
            {cappedTotal} / {domain.maxPoints} pts
          </span>
        </div>
      )}
    </div>
  )
}
