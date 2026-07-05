'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'
import {
  calculateDomainScore,
  isEvidenceBased,
  getEssentialDomains,
} from '@/lib/specialties'
import type {
  SpecialtyConfig,
  SpecialtyApplication,
  SpecialtyEntryLink,
} from '@/lib/specialties'
import { DomainTab } from './domain-tab'
import { SelectionProcessStrip } from './selection-process-strip'
import { SpecialtyScoreCharts } from './specialty-score-charts'
import { PointsHeader, EvidenceHeader } from './specialty-detail-header'
import { PointsLayoutTabs, GroupedDomainTabs } from './specialty-domain-tabs'
import { ShareModal } from './specialty-share-modal'

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

      <SelectionProcessStrip process={config.selectionProcess} variant="full" />

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
      <div className="mt-6 pt-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
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
        {config.sources && config.sources.length > 0 && (
          <details className="mt-2">
            <summary className="text-[10px] text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)] transition-colors w-fit">
              Where these facts come from ({config.sources.length} official {config.sources.length === 1 ? 'source' : 'sources'})
            </summary>
            <ul className="mt-2 space-y-1.5">
              {config.sources.map(source => (
                <li key={source.url} className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-[var(--text-secondary)] transition-colors break-all"
                  >
                    {source.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                  </a>
                  <span className="mx-1">&middot;</span>
                  <span>{source.claim}</span>
                  <span className="ml-1 text-[var(--text-faint)]">(verified {source.lastVerified})</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  )
}
