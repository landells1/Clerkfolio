'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'
import { apiFetch } from '@/lib/api-fetch'
import {
  calculateDomainScore,
  calculateDomainsScore,
  calculateBonusScore,
  isEvidenceBased,
  getEssentialDomains,
  getDesirableDomains,
  getEvidenceProgress,
} from '@/lib/specialties'
import type {
  SpecialtyConfig,
  SpecialtyDomain,
  SpecialtyApplication,
  SpecialtyEntryLink,
} from '@/lib/specialties'
import { DomainTab } from './domain-tab'

type Props = {
  config: SpecialtyConfig
  application: SpecialtyApplication
  links: SpecialtyEntryLink[]
  // Updater form (never a plain array) so every mutation commits against the
  // freshest list; concurrent updates from other bands/domains cannot be lost
  // to a render-time snapshot.
  onLinksChange: (update: (prev: SpecialtyEntryLink[]) => SpecialtyEntryLink[]) => void
  onApplicationUpdate: (app: SpecialtyApplication) => void
  onBack: () => void
  isPro?: boolean
}

export function SpecialtyDetail({
  config,
  application,
  links,
  onLinksChange,
  onApplicationUpdate,
  onBack,
  isPro = false,
}: Props) {
  const supabase = createClient()
  const { addToast } = useToast()
  const evidenceBased = isEvidenceBased(config)
  const [activeDomainKey, setActiveDomainKey] = useState(config.domains[0]?.key ?? '')
  const [bonusClaimed, setBonusClaimed] = useState(application.bonus_claimed)
  const [togglingBonus, setTogglingBonus] = useState(false)
  const [tickingAll, setTickingAll] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [isTarget, setIsTarget] = useState(application.is_target ?? false)
  const [togglingTarget, setTogglingTarget] = useState(false)

  // Application mode toggle: persists the spec.is_target flag. Partial unique
  // index in the DB ensures only one specialty per user can be the target,
  // so flipping a new one to true automatically requires the old one off; we
  // do that client-side first to avoid the unique-violation.
  async function handleTargetToggle() {
    if (togglingTarget) return
    setTogglingTarget(true)
    const next = !isTarget
    setIsTarget(next)
    if (next) {
      // Clear any other targets first (one-target-per-user invariant). If this
      // fails, stop here: the follow-up update would hit the one-target unique
      // index and the toggle would revert confusingly.
      const { error: clearError } = await supabase
        .from('specialty_applications')
        .update({ is_target: false })
        .eq('user_id', application.user_id)
        .neq('id', application.id)
      if (clearError) {
        setIsTarget(!next)
        setTogglingTarget(false)
        return
      }
    }
    const { error } = await supabase
      .from('specialty_applications')
      .update({ is_target: next })
      .eq('id', application.id)
    if (error) {
      setIsTarget(!next)
    } else {
      onApplicationUpdate({ ...application, is_target: next })
    }
    setTogglingTarget(false)
  }

  async function handleBonusToggle(_optionKey: string) {
    if (togglingBonus) return
    setTogglingBonus(true)
    const newValue = !bonusClaimed
    // optimistic
    setBonusClaimed(newValue)
    onApplicationUpdate({ ...application, bonus_claimed: newValue })

    const { error } = await supabase
      .from('specialty_applications')
      .update({ bonus_claimed: newValue })
      .eq('id', application.id)

    if (error) {
      // revert
      setBonusClaimed(!newValue)
      onApplicationUpdate({ ...application, bonus_claimed: !newValue })
    }
    setTogglingBonus(false)
  }

  async function handleTickAllEssentials() {
    if (tickingAll) return
    setTickingAll(true)
    const essentials = getEssentialDomains(config)
    const metLinks = links.filter(l =>
      essentials.some(d => d.key === l.domain_key) &&
      l.is_checkbox &&
      l.band_label === 'Met'
    )
    const unmetDomains = essentials.filter(d => !metLinks.some(l => l.domain_key === d.key))

    if (unmetDomains.length === 0 && metLinks.length > 0) {
      const ids = metLinks.map(link => link.id).filter(Boolean)
      const { error } = await supabase.from('specialty_entry_links').delete().in('id', ids)
      if (error) {
        addToast('Failed to untick essentials. Check your connection and try again.', 'error')
      } else {
        onLinksChange(prev => prev.filter(link => !ids.includes(link.id)))
      }
    } else if (unmetDomains.length > 0) {
      const { data: rows, error } = await supabase
        .from('specialty_entry_links')
        .insert(unmetDomains.map(d => ({
          application_id: application.id,
          domain_key: d.key,
          entry_id: null,
          entry_type: null,
          band_label: 'Met',
          points_claimed: 0,
          is_checkbox: true,
        })))
        .select()
      if (error) {
        addToast('Failed to tick all essentials. Check your connection and try again.', 'error')
      } else if (rows) {
        onLinksChange(prev => [...prev, ...(rows as SpecialtyEntryLink[])])
      }
    }
    setTickingAll(false)
  }

  function handleDomainLinksChange(update: (prev: SpecialtyEntryLink[]) => SpecialtyEntryLink[]) {
    // Apply the domain's update against the freshest full list, scoped to this
    // application + domain, leaving every other link untouched
    const activeDomain = config.domains.find(d => d.key === activeDomainKey)
    if (!activeDomain) return
    onLinksChange(prev => {
      const domainLinks = prev.filter(
        l => l.application_id === application.id && l.domain_key === activeDomainKey
      )
      const otherLinks = prev.filter(
        l => l.application_id !== application.id || l.domain_key !== activeDomainKey
      )
      return [...otherLinks, ...update(domainLinks)]
    })
  }

  const activeDomain = config.domains.find(d => d.key === activeDomainKey)
  const scoredDomains = config.domains
    .filter(domain => domain.criteriaType !== 'essential' && domain.maxPoints > 0)
    .map(domain => ({
      key: domain.key,
      label: domain.label,
      score: calculateDomainScore(domain, links),
      max: domain.maxPoints,
    }))

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        My Specialties
      </button>

      {/* Header */}
      <div className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-6 mb-5">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl font-semibold text-[var(--text-primary)]">{config.name}</h1>
              <span className="px-2 py-0.5 rounded bg-white/[0.06] text-[var(--text-muted)] text-xs">
                {config.cycleYear}
              </span>
              {!config.isOfficial && (
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20">
                  Unofficial
                </span>
              )}
              {evidenceBased && (
                <span className="px-2 py-0.5 rounded bg-white/[0.06] text-[var(--text-secondary)] text-xs border border-white/[0.08]">
                  Evidence-based
                </span>
              )}
            </div>

            {evidenceBased ? (
              <EvidenceHeader config={config} links={links} />
            ) : (
              <PointsHeader
                config={config}
                application={{ ...application, bonus_claimed: bonusClaimed }}
                links={links}
              />
            )}
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={handleTargetToggle}
              disabled={togglingTarget}
              title={isTarget ? 'This specialty is your current application target' : 'Mark as your application target to surface a deadline countdown on the dashboard'}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 ${
                isTarget
                  ? 'bg-pill-amber border-pill-amber text-[var(--warning)]'
                  : 'bg-surface-1 border-subtle text-fg-2 hover:border-default hover:text-fg'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill={isTarget ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
              </svg>
              {isTarget ? 'Application target' : 'Set as target'}
            </button>
            {isPro && (
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-fg-1 bg-surface-1 hover:bg-surface-3 border border-subtle rounded-lg transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
                Share
              </button>
            )}
          </div>
        </div>

        {showShareModal && (
          <ShareModal specialtyKey={application.specialty_key} onClose={() => setShowShareModal(false)} />
        )}

        {/* Bonus options - only for points-based with bonuses */}
        {!evidenceBased && config.bonusOptions && config.bonusOptions.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[var(--text-emphasis)] font-medium uppercase tracking-wide">Bonus Points</p>
            {config.bonusOptions.map(opt => (
              <label
                key={opt.key}
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => handleBonusToggle(opt.key)}
              >
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                    bonusClaimed
                      ? 'bg-[var(--accent)] border-[var(--accent)]'
                      : 'bg-transparent border-white/[0.2] hover:border-white/[0.4]'
                  }`}
                >
                  {bonusClaimed && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--bg-canvas)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-[var(--text-secondary)]">{opt.label}</span>
                {bonusClaimed && (
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent-soft-text)] text-xs font-semibold border border-accent/20">
                    +{opt.points} pts
                  </span>
                )}
              </label>
            ))}
          </div>
        )}
      </div>

      {!evidenceBased && scoredDomains.length > 0 && (
        <SpecialtyScoreCharts domains={scoredDomains} />
      )}

      {/* Domain tabs */}
      {evidenceBased ? (
        <GroupedDomainTabs
          config={config}
          links={links}
          activeDomainKey={activeDomainKey}
          onSelect={setActiveDomainKey}
          onTickAllEssentials={handleTickAllEssentials}
          tickingAll={tickingAll}
        />
      ) : (
        <PointsLayoutTabs
          config={config}
          links={links}
          activeDomainKey={activeDomainKey}
          onSelect={setActiveDomainKey}
          onTickAllEssentials={handleTickAllEssentials}
          tickingAll={tickingAll}
        />
      )}

      {/* Active domain content */}
      {activeDomain && (
        <DomainTab
          domain={activeDomain}
          links={links.filter(l => l.domain_key === activeDomainKey)}
          applicationId={application.id}
          specialtyName={config.name}
          specialtyKey={application.specialty_key}
          onLinksChange={handleDomainLinksChange}
        />
      )}

      {/* Source citation */}
      <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center gap-2">
        {!config.isOfficial && <span className="text-amber-400">⚠️</span>}
        <p className="text-xs text-[var(--text-secondary)]">
          {evidenceBased ? 'Person specification: ' : 'Scoring criteria: '}
          <a
            href={config.source}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[var(--text-secondary)] transition-colors"
          >
            {config.sourceLabel}
          </a>
          {!config.isOfficial && (
            <span className="ml-1 text-amber-400/70">- Unofficial, verify with official person spec</span>
          )}
        </p>
      </div>
    </div>
  )
}

function SpecialtyScoreCharts({
  domains,
}: {
  domains: Array<{ key: string; label: string; score: number; max: number }>
}) {
  const maxLabelLength = 28
  const chartDomains = domains.map(domain => ({
    ...domain,
    fraction: domain.max > 0 ? Math.min(domain.score / domain.max, 1) : 0,
    shortLabel: domain.label.length > maxLabelLength ? `${domain.label.slice(0, maxLabelLength - 1)}…` : domain.label,
  }))
  const canRenderRadar = chartDomains.length >= 3
  const centerX = 180
  const centerY = 150
  const radius = 88
  const labelRadius = 118
  const angles = chartDomains.map((_, index) => (index / chartDomains.length) * (Math.PI * 2) - Math.PI / 2)
  const radarPoints = chartDomains.map((domain, index) => {
    const angle = angles[index]
    const scaledRadius = radius * domain.fraction
    return `${centerX + Math.cos(angle) * scaledRadius},${centerY + Math.sin(angle) * scaledRadius}`
  }).join(' ')

  return (
    <div className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Domain score bars</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">How much of each scored domain you have already claimed.</p>
        </div>
        <div className="space-y-2.5">
          {chartDomains.map(domain => (
            <div key={domain.key} className="flex items-center gap-3">
              <span className="w-40 shrink-0 truncate text-xs text-[var(--text-secondary)]" title={domain.label}>
                {domain.shortLabel}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.round(domain.fraction * 100)}%` }} />
              </div>
              <span className="w-16 shrink-0 text-right text-xs font-mono text-[var(--text-secondary)]">
                {domain.score}/{domain.max}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Domain radar</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Normalised coverage across the scored domains for this specialty.</p>
        </div>
        {canRenderRadar ? (
          <svg viewBox="0 0 360 300" className="w-full" aria-label="Specialty domain radar chart">
            {[0.25, 0.5, 0.75, 1].map(fraction => (
              <polygon
                key={fraction}
                points={angles.map(angle => `${centerX + Math.cos(angle) * radius * fraction},${centerY + Math.sin(angle) * radius * fraction}`).join(' ')}
                fill="none"
                stroke="var(--text-faint)"
                strokeWidth="1"
              />
            ))}
            {angles.map((angle, index) => (
              <line
                key={chartDomains[index].key}
                x1={centerX}
                y1={centerY}
                x2={centerX + Math.cos(angle) * radius}
                y2={centerY + Math.sin(angle) * radius}
                stroke="var(--text-faint)"
                strokeWidth="1"
              />
            ))}
            <polygon points={radarPoints} fill="rgba(27,111,217,0.2)" stroke="#1B6FD9" strokeWidth="1.6" />
            {chartDomains.map((domain, index) => {
              const angle = angles[index]
              const pointX = centerX + Math.cos(angle) * radius * domain.fraction
              const pointY = centerY + Math.sin(angle) * radius * domain.fraction
              const labelX = centerX + Math.cos(angle) * labelRadius
              const labelY = centerY + Math.sin(angle) * labelRadius
              const textAnchor = Math.cos(angle) > 0.2 ? 'start' : Math.cos(angle) < -0.2 ? 'end' : 'middle'
              return (
                <g key={domain.key}>
                  <circle cx={pointX} cy={pointY} r="3.5" fill="#1B6FD9" />
                  <text x={labelX} y={labelY} textAnchor={textAnchor} fontSize="10" fill="var(--text-secondary)">
                    {domain.shortLabel}
                  </text>
                  <text x={labelX} y={labelY + 12} textAnchor={textAnchor} fontSize="9" fill="var(--text-muted)">
                    {domain.score}/{domain.max}
                  </text>
                </g>
              )
            })}
          </svg>
        ) : (
          <p className="py-12 text-center text-xs text-[var(--text-secondary)]">
            Add more scored domains to render the radar view.
          </p>
        )}
      </section>
    </div>
  )
}

// ---------- Header variants ----------

function PointsHeader({
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

function EvidenceHeader({
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

// ---------- Domain tab variants ----------

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
function PointsLayoutTabs({
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

function GroupedDomainTabs({
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

// ---------- Share Modal ----------

type ShareLinkData = { id: string; token: string; expires_at: string }

function ShareModal({ specialtyKey, onClose }: { specialtyKey: string; onClose: () => void }) {
  const [link, setLink] = useState<ShareLinkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [copied, setCopied] = useState(false)

  const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://clerkfolio.co.uk'

  useEffect(() => {
    async function load() {
      const { ok, data } = await apiFetch<(ShareLinkData & { specialty_key: string })[]>('/api/share')
      if (ok && data) {
        const match = data.find(l => l.specialty_key === specialtyKey)
        setLink(match ?? null)
      }
      setLoading(false)
    }
    load()
  }, [specialtyKey])

  async function handleGenerate() {
    setGenerating(true)
    const { ok, data } = await apiFetch<ShareLinkData>('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ specialty_key: specialtyKey }),
    })
    if (ok && data) {
      setLink(data)
    }
    setGenerating(false)
  }

  async function handleRevoke() {
    if (!link) return
    if (!confirm('Revoke this link? Anyone using it will lose access immediately.')) return
    setRevoking(true)
    const { ok } = await apiFetch(`/api/share?id=${link.id}`, { method: 'DELETE' })
    if (ok) setLink(null)
    setRevoking(false)
  }

  function handleCopy() {
    if (!link) return
    navigator.clipboard.writeText(`${BASE_URL}/share/${link.token}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const url = link ? `${BASE_URL}/share/${link.token}` : null
  const expiresFormatted = link
    ? new Date(link.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-surface)] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-5 gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Share read-only link</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Anyone with the link can view your evidence - no account needed.
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mt-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full motion-safe:animate-spin" />
          </div>
        ) : link ? (
          <div className="space-y-4">
            {/* URL display */}
            <div className="bg-[var(--bg-canvas)] border border-white/[0.08] rounded-xl p-3">
              <p className="text-xs font-mono text-[var(--text-secondary)] truncate">{url}</p>
            </div>
            <p className="text-xs text-[var(--text-muted)]">Expires {expiresFormatted} · Read-only</p>
            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {copied
                    ? <polyline points="20 6 9 17 4 12" />
                    : <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>
                  }
                </svg>
                {copied ? 'Copied!' : 'Copy link'}
              </button>
              <a
                href={url!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                Preview
              </a>
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 rounded-lg transition-colors disabled:opacity-50"
              >
                {revoking ? 'Revoking…' : 'Revoke'}
              </button>
            </div>
            {/* Manage all links */}
            <p className="text-xs text-[var(--text-secondary)] text-center">
              Manage all shared links in{' '}
              <a href="/export?tab=share" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline transition-colors">
                Import &amp; export → Share
              </a>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-[var(--bg-canvas)] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span className="text-xs text-[var(--text-muted)]">Link expires after 30 days</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span className="text-xs text-[var(--text-muted)]">Read-only - no login required</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
                <span className="text-xs text-[var(--text-muted)]">Revoke at any time</span>
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-50 text-[var(--button-primary-text)] font-semibold text-sm rounded-xl transition-colors"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-[var(--bg-canvas)] border-t-[var(--bg-canvas)] rounded-full motion-safe:animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                  Generate link
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
