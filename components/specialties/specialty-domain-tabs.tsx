'use client'

import {
  calculateDomainScore,
  getEssentialDomains,
  getDesirableDomains,
} from '@/lib/specialties'
import type {
  SpecialtyConfig,
  SpecialtyDomain,
  SpecialtyEntryLink,
} from '@/lib/specialties'

function FlatDomainTabs({
  config,
  links,
  activeDomainKey,
  onSelect,
}: {
  config: SpecialtyConfig
  links: SpecialtyEntryLink[]
  activeDomainKey: string
  onSelect: (key: string) => void
}) {
  return (
    <div className="overflow-x-auto pb-1 mb-1">
      <div className="flex gap-1 min-w-max">
        {config.domains.map(domain => (
          <DomainTabButton
            key={domain.key}
            domain={domain}
            score={calculateDomainScore(domain, links)}
            isActive={domain.key === activeDomainKey}
            onSelect={() => onSelect(domain.key)}
          />
        ))}
      </div>
    </div>
  )
}

// Tier 1 (points-based) layout. If the config has essentials, render an
// Essentials group above the scored tabs; otherwise fall back to the flat layout.
export function PointsLayoutTabs({
  config,
  links,
  activeDomainKey,
  onSelect,
  onTickAllEssentials,
  tickingAll = false,
}: {
  config: SpecialtyConfig
  links: SpecialtyEntryLink[]
  activeDomainKey: string
  onSelect: (key: string) => void
  onTickAllEssentials?: () => Promise<void>
  tickingAll?: boolean
}) {
  const essentials = getEssentialDomains(config)
  const scored = config.domains.filter(d => d.criteriaType !== 'essential')

  if (essentials.length === 0) {
    return (
      <FlatDomainTabs
        config={config}
        links={links}
        activeDomainKey={activeDomainKey}
        onSelect={onSelect}
      />
    )
  }

  const unmetCount = essentials.filter(
    d => !links.some(l => l.domain_key === d.key && l.is_checkbox && l.band_label === 'Met')
  ).length

  return (
    <div className="space-y-3 mb-1">
      <DomainGroup
        title="Essentials"
        subtitle="Entry requirements - must be met by start date"
        domains={essentials}
        links={links}
        activeDomainKey={activeDomainKey}
        onSelect={onSelect}
        isEvidenceMode
        onTickAll={onTickAllEssentials}
        tickingAll={tickingAll}
        unmetCount={unmetCount}
      />
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-xs text-[var(--text-emphasis)] font-semibold uppercase tracking-wide shrink-0">
            Scoring
          </span>
          <span className="text-xs text-[var(--text-secondary)] flex-1">
            Self-assessment for shortlisting
          </span>
        </div>
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-1 min-w-max">
            {scored.map(domain => (
              <DomainTabButton
                key={domain.key}
                domain={domain}
                score={calculateDomainScore(domain, links)}
                isActive={domain.key === activeDomainKey}
                onSelect={() => onSelect(domain.key)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function GroupedDomainTabs({
  config,
  links,
  activeDomainKey,
  onSelect,
  onTickAllEssentials,
  tickingAll = false,
}: {
  config: SpecialtyConfig
  links: SpecialtyEntryLink[]
  activeDomainKey: string
  onSelect: (key: string) => void
  onTickAllEssentials?: () => Promise<void>
  tickingAll?: boolean
}) {
  const essentials = getEssentialDomains(config)
  const desirables = getDesirableDomains(config)
  const unmetCount = essentials.filter(
    d => !links.some(l => l.domain_key === d.key && l.is_checkbox && l.band_label === 'Met')
  ).length

  return (
    <div className="space-y-3 mb-1">
      {essentials.length > 0 && (
        <DomainGroup
          title="Essentials"
          subtitle="Entry requirements - must be met by start date"
          domains={essentials}
          links={links}
          activeDomainKey={activeDomainKey}
          onSelect={onSelect}
          isEvidenceMode
          onTickAll={onTickAllEssentials}
          tickingAll={tickingAll}
          unmetCount={unmetCount}
        />
      )}
      {desirables.length > 0 && (
        <DomainGroup
          title="Desirables"
          subtitle="Application & interview criteria - build evidence over time"
          domains={desirables}
          links={links}
          activeDomainKey={activeDomainKey}
          onSelect={onSelect}
          isEvidenceMode
        />
      )}
    </div>
  )
}

function DomainGroup({
  title,
  subtitle,
  domains,
  links,
  activeDomainKey,
  onSelect,
  isEvidenceMode,
  onTickAll,
  tickingAll = false,
  unmetCount = 0,
}: {
  title: string
  subtitle: string
  domains: SpecialtyDomain[]
  links: SpecialtyEntryLink[]
  activeDomainKey: string
  onSelect: (key: string) => void
  isEvidenceMode: boolean
  onTickAll?: () => Promise<void>
  tickingAll?: boolean
  unmetCount?: number
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-xs text-[var(--text-emphasis)] font-semibold uppercase tracking-wide shrink-0">
          {title}
        </span>
        <span className="text-xs text-[var(--text-secondary)] flex-1">{subtitle}</span>
        {onTickAll && (
          <button
            onClick={onTickAll}
            disabled={tickingAll}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-text)] disabled:opacity-50 transition-colors shrink-0"
          >
            {tickingAll ? 'Updating...' : unmetCount > 0 ? `Tick all (${unmetCount})` : 'Untick all'}
          </button>
        )}
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-1 min-w-max">
          {domains.map(domain => {
            const hasLink = links.some(l => l.domain_key === domain.key)
            return (
              <DomainTabButton
                key={domain.key}
                domain={domain}
                isActive={domain.key === activeDomainKey}
                onSelect={() => onSelect(domain.key)}
                evidenceState={
                  isEvidenceMode
                    ? hasLink
                      ? domain.criteriaType === 'essential'
                        ? 'met'
                        : 'evidenced'
                      : 'empty'
                    : undefined
                }
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DomainTabButton({
  domain,
  score,
  isActive,
  onSelect,
  evidenceState,
}: {
  domain: SpecialtyDomain
  score?: number
  isActive: boolean
  onSelect: () => void
  evidenceState?: 'empty' | 'met' | 'evidenced'
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
        isActive
          ? 'bg-[var(--accent-soft)] text-[var(--accent-soft-text)] border border-accent/25'
          : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-white/[0.06] hover:border-white/[0.14] hover:text-[var(--text-secondary)]'
      }`}
    >
      <span>{domain.label}</span>
      {evidenceState !== undefined ? (
        <EvidenceStateBadge state={evidenceState} isActive={isActive} />
      ) : (
        <span
          className={`px-1.5 py-0.5 rounded-md text-xs font-semibold ${
            isActive ? 'bg-[var(--accent-soft)] text-[var(--accent-soft-text)]' : 'bg-white/[0.06] text-[var(--text-muted)]'
          }`}
        >
          {score ?? 0}
        </span>
      )}
    </button>
  )
}

function EvidenceStateBadge({ state, isActive }: { state: 'empty' | 'met' | 'evidenced'; isActive: boolean }) {
  if (state === 'empty') {
    return (
      <span
        className={`w-3.5 h-3.5 rounded-full border ${
          isActive ? 'border-accent/40' : 'border-white/[0.15]'
        }`}
      />
    )
  }
  // met or evidenced - show check
  return (
    <span
      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
        isActive ? 'bg-[var(--accent)]' : 'bg-accent/80'
      }`}
    >
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--bg-canvas)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  )
}
