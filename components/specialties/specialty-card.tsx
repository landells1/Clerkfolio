'use client'

import { createClient } from '@/lib/supabase/client'
import {
  calculateDomainScore,
  calculateTotalScore,
  isEvidenceBased,
  getEvidenceProgress,
} from '@/lib/specialties'
import type { SpecialtyConfig, SpecialtyApplication, SpecialtyEntryLink } from '@/lib/specialties'

type Props = {
  config: SpecialtyConfig
  application: SpecialtyApplication
  links: SpecialtyEntryLink[]
  isSelected: boolean
  onSelect: () => void
  onRemove: () => void
}

function truncateLabel(label: string, words = 3): string {
  return label.split(' ').slice(0, words).join(' ')
}

export function SpecialtyCard({ config, application, links, isSelected: _, onSelect, onRemove }: Props) {
  const supabase = createClient()
  const evidenceBased = isEvidenceBased(config)

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    if (!window.confirm(`Remove ${config.name} tracker? This will delete all linked evidence for this specialty.`)) return
    const { error: linksError } = await supabase.from('specialty_entry_links').delete().eq('application_id', application.id)
    if (linksError) { alert('Failed to remove specialty. Please try again.'); return }
    const { error: appError } = await supabase.from('specialty_applications').delete().eq('id', application.id)
    if (appError) { alert('Failed to remove specialty. Please try again.'); return }
    onRemove()
  }

  return (
    <div
      onClick={onSelect}
      className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5 cursor-pointer hover:border-white/[0.16] transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h3 className="font-semibold text-[#F5F5F2] text-base truncate">{config.name}</h3>
          <span className="shrink-0 px-2 py-0.5 rounded-md bg-white/[0.06] text-[rgba(245,245,242,0.45)] text-xs font-medium">
            {config.cycleYear}
          </span>
          {!config.isOfficial && (
            <span className="shrink-0 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
              Unofficial
            </span>
          )}
          {evidenceBased && (
            <span className="shrink-0 px-2 py-0.5 rounded-md bg-white/[0.06] text-[rgba(245,245,242,0.55)] text-xs font-medium border border-white/[0.08]">
              Evidence-based
            </span>
          )}
        </div>
        <button
          onClick={handleRemove}
          className="ml-2 shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-[rgba(245,245,242,0.3)] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
          aria-label="Remove specialty"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {evidenceBased ? (
        <EvidenceProgress config={config} links={links} />
      ) : (
        <PointsProgress config={config} application={application} links={links} />
      )}

      {/* Source link */}
      <div className="flex items-center gap-1.5 pt-3 border-t border-white/[0.06]">
        {!config.isOfficial && (
          <span className="text-amber-400 text-xs mr-1">⚠️</span>
        )}
        <a
          href={config.source}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1 text-xs text-[rgba(245,245,242,0.35)] hover:text-[rgba(245,245,242,0.6)] transition-colors"
        >
          {config.isOfficial ? 'Official criteria' : 'Unofficial criteria — verify with official person spec'}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>
    </div>
  )
}

// ---------- Points-based progress (IMT-style) ----------

function PointsProgress({
  config,
  application,
  links,
}: {
  config: SpecialtyConfig
  application: SpecialtyApplication
  links: SpecialtyEntryLink[]
}) {
  const total = calculateTotalScore(config, application, links)
  const pct = config.totalMax > 0 ? Math.min((total / config.totalMax) * 100, 100) : 0
  const bonusPoints = config.bonusOptions?.reduce((s, b) => s + b.points, 0) ?? 0

  return (
    <>
      {/* Total score */}
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-3xl font-bold text-[#F5F5F2]">{total}</span>
        <span className="text-sm text-[rgba(245,245,242,0.4)]">/ {config.totalMax} pts</span>
        {application.bonus_claimed && bonusPoints > 0 && (
          <span className="ml-1 px-2 py-0.5 rounded-full bg-[#1B6FD9]/15 text-[#1B6FD9] text-xs font-semibold border border-[#1B6FD9]/20">
            +{bonusPoints} bonus
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-white/[0.06] rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-[#1B6FD9] rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Domain chips — scored domains only, essentials excluded */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {config.domains.filter(d => d.criteriaType !== 'essential').map(domain => {
          const score = calculateDomainScore(domain, links)
          return (
            <span
              key={domain.key}
              className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[rgba(245,245,242,0.55)] text-xs"
            >
              {truncateLabel(domain.label)}: {score} pts
            </span>
          )
        })}
      </div>
    </>
  )
}

// ---------- Evidence-based progress (essentials / desirables) ----------

function EvidenceProgress({
  config,
  links,
}: {
  config: SpecialtyConfig
  links: SpecialtyEntryLink[]
}) {
  const { essentialsTotal, essentialsMet, desirablesTotal, desirablesEvidenced } =
    getEvidenceProgress(config, links)

  const essentialsPct = essentialsTotal > 0 ? (essentialsMet / essentialsTotal) * 100 : 0
  const desirablesPct = desirablesTotal > 0 ? (desirablesEvidenced / desirablesTotal) * 100 : 0

  return (
    <div className="grid grid-cols-2 gap-4 mb-4">
      <ProgressBlock
        label="Essentials"
        sublabel="met"
        current={essentialsMet}
        total={essentialsTotal}
        pct={essentialsPct}
      />
      <ProgressBlock
        label="Desirables"
        sublabel="evidenced"
        current={desirablesEvidenced}
        total={desirablesTotal}
        pct={desirablesPct}
      />
    </div>
  )
}

function ProgressBlock({
  label,
  sublabel,
  current,
  total,
  pct,
}: {
  label: string
  sublabel: string
  current: number
  total: number
  pct: number
}) {
  return (
    <div>
      <p className="text-[10px] text-[rgba(245,245,242,0.4)] font-semibold uppercase tracking-wide mb-1">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <span className="text-2xl font-bold text-[#F5F5F2]">{current}</span>
        <span className="text-xs text-[rgba(245,245,242,0.4)]">
          / {total} {sublabel}
        </span>
      </div>
      <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#1B6FD9] rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
