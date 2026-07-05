'use client'

import {
  calculateDomainsScore,
  calculateBonusScore,
  getEssentialDomains,
  getEvidenceProgress,
} from '@/lib/specialties'
import type {
  SpecialtyConfig,
  SpecialtyApplication,
  SpecialtyEntryLink,
} from '@/lib/specialties'

export function PointsHeader({
  config,
  application,
  links,
}: {
  config: SpecialtyConfig
  application: SpecialtyApplication
  links: SpecialtyEntryLink[]
}) {
  // totalMax is the domain maximum from the official matrix; a claimed bonus
  // sits on top and gets its own chip so the header never reads "35/30 pts".
  const domainsScore = calculateDomainsScore(config, links)
  const bonusScore = calculateBonusScore(config, application)
  const pct = config.totalMax > 0 ? Math.min((domainsScore / config.totalMax) * 100, 100) : 0
  const essentials = getEssentialDomains(config)
  const essentialsMet = essentials.filter(d =>
    links.some(l => l.domain_key === d.key && l.is_checkbox && l.band_label === 'Met')
  ).length
  const essentialsPct = essentials.length > 0 ? (essentialsMet / essentials.length) * 100 : 0

  if (essentials.length === 0) {
    return (
      <>
        <div className="flex items-baseline gap-1.5 mb-3">
          <span className="text-4xl font-bold text-[var(--text-primary)]">{domainsScore}</span>
          <span className="text-sm text-[var(--text-muted)]">/ {config.totalMax} pts</span>
          {bonusScore > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent-soft-text)] text-xs font-semibold border border-accent/20">
              +{bonusScore} bonus
            </span>
          )}
        </div>
        <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-6 mt-2">
      <div>
        <p className="text-[10px] text-[var(--text-emphasis)] font-semibold uppercase tracking-wide mb-1">
          Score
        </p>
        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-3xl font-bold text-[var(--text-primary)]">{domainsScore}</span>
          <span className="text-xs text-[var(--text-muted)]">/ {config.totalMax} pts</span>
          {bonusScore > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent-soft-text)] text-[10px] font-semibold border border-accent/20">
              +{bonusScore} bonus
            </span>
          )}
        </div>
        <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <HeaderProgressBlock
        label="Essentials"
        sublabel="met"
        current={essentialsMet}
        total={essentials.length}
        pct={essentialsPct}
      />
    </div>
  )
}

export function EvidenceHeader({
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
    <div className="grid grid-cols-2 gap-6 mt-2">
      <HeaderProgressBlock
        label="Essentials"
        sublabel="met"
        current={essentialsMet}
        total={essentialsTotal}
        pct={essentialsPct}
      />
      <HeaderProgressBlock
        label="Desirables"
        sublabel="evidenced"
        current={desirablesEvidenced}
        total={desirablesTotal}
        pct={desirablesPct}
      />
    </div>
  )
}

function HeaderProgressBlock({
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
      <p className="text-[10px] text-[var(--text-emphasis)] font-semibold uppercase tracking-wide mb-1">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-3xl font-bold text-[var(--text-primary)]">{current}</span>
        <span className="text-xs text-[var(--text-muted)]">
          / {total} {sublabel}
        </span>
      </div>
      <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
