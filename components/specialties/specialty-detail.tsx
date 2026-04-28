'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  calculateDomainScore,
  calculateTotalScore,
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
  allLinks: SpecialtyEntryLink[]
  onLinksChange: (links: SpecialtyEntryLink[]) => void
  onApplicationUpdate: (app: SpecialtyApplication) => void
  onBack: () => void
  isPro?: boolean
}

export function SpecialtyDetail({
  config,
  application,
  links,
  allLinks,
  onLinksChange,
  onApplicationUpdate,
  onBack,
  isPro = false,
}: Props) {
  const supabase = createClient()
  const evidenceBased = isEvidenceBased(config)
  const [activeDomainKey, setActiveDomainKey] = useState(config.domains[0]?.key ?? '')
  const [bonusClaimed, setBonusClaimed] = useState(application.bonus_claimed)
  const [togglingBonus, setTogglingBonus] = useState(false)
  const [tickingAll, setTickingAll] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

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
    const unmetDomains = essentials.filter(
      d => !links.some(l => l.domain_key === d.key && l.is_checkbox && l.band_label === 'Met')
    )
    if (unmetDomains.length > 0) {
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
        alert(`Failed to tick all essentials: ${error.message}`)
      } else if (rows) {
        onLinksChange([...allLinks, ...(rows as SpecialtyEntryLink[])])
      }
    }
    setTickingAll(false)
  }

  function handleDomainLinksChange(newDomainLinks: SpecialtyEntryLink[]) {
    // Replace all links for this application with the updated set for this domain
    const activeDomain = config.domains.find(d => d.key === activeDomainKey)
    if (!activeDomain) return
    const otherLinks = allLinks.filter(
      l => l.application_id !== application.id || l.domain_key !== activeDomainKey
    )
    onLinksChange([...otherLinks, ...newDomainLinks])
  }

  const activeDomain = config.domains.find(d => d.key === activeDomainKey)

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-[rgba(245,245,242,0.45)] hover:text-[#F5F5F2] transition-colors mb-5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        My Specialties
      </button>

      {/* Header */}
      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-5">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl font-semibold text-[#F5F5F2]">{config.name}</h1>
              <span className="px-2 py-0.5 rounded bg-white/[0.06] text-[rgba(245,245,242,0.45)] text-xs">
                {config.cycleYear}
              </span>
              {!config.isOfficial && (
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20">
                  Unofficial
                </span>
              )}
              {evidenceBased && (
                <span className="px-2 py-0.5 rounded bg-white/[0.06] text-[rgba(245,245,242,0.55)] text-xs border border-white/[0.08]">
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

          {isPro && (
            <button
              onClick={() => setShowShareModal(true)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[rgba(245,245,242,0.7)] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg transition-colors"
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

        {showShareModal && (
          <ShareModal specialtyKey={application.specialty_key} onClose={() => setShowShareModal(false)} />
        )}

        {/* Bonus options — only for points-based with bonuses */}
        {!evidenceBased && config.bonusOptions && config.bonusOptions.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[rgba(245,245,242,0.4)] font-medium uppercase tracking-wide">Bonus Points</p>
            {config.bonusOptions.map(opt => (
              <label
                key={opt.key}
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => handleBonusToggle(opt.key)}
              >
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                    bonusClaimed
                      ? 'bg-[#1B6FD9] border-[#1B6FD9]'
                      : 'bg-transparent border-white/[0.2] hover:border-white/[0.4]'
                  }`}
                >
                  {bonusClaimed && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0B0B0C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-[rgba(245,245,242,0.7)]">{opt.label}</span>
                {bonusClaimed && (
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-[#1B6FD9]/15 text-[#1B6FD9] text-xs font-semibold border border-[#1B6FD9]/20">
                    +{opt.points} pts
                  </span>
                )}
              </label>
            ))}
          </div>
        )}
      </div>

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
        <p className="text-xs text-[rgba(245,245,242,0.35)]">
          {evidenceBased ? 'Person specification: ' : 'Scoring criteria: '}
          <a
            href={config.source}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[rgba(245,245,242,0.6)] transition-colors"
          >
            {config.sourceLabel}
          </a>
          {!config.isOfficial && (
            <span className="ml-1 text-amber-400/70">— Unofficial, verify with official person spec</span>
          )}
        </p>
      </div>
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
  const total = calculateTotalScore(config, application, links)
  const pct = config.totalMax > 0 ? Math.min((total / config.totalMax) * 100, 100) : 0
  const essentials = getEssentialDomains(config)
  const essentialsMet = essentials.filter(d =>
    links.some(l => l.domain_key === d.key && l.is_checkbox && l.band_label === 'Met')
  ).length
  const essentialsPct = essentials.length > 0 ? (essentialsMet / essentials.length) * 100 : 0

  if (essentials.length === 0) {
    return (
      <>
        <div className="flex items-baseline gap-1.5 mb-3">
          <span className="text-4xl font-bold text-[#F5F5F2]">{total}</span>
          <span className="text-sm text-[rgba(245,245,242,0.4)]">/ {config.totalMax} pts</span>
        </div>
        <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1B6FD9] rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-6 mt-2">
      <div>
        <p className="text-[10px] text-[rgba(245,245,242,0.4)] font-semibold uppercase tracking-wide mb-1">
          Score
        </p>
        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-3xl font-bold text-[#F5F5F2]">{total}</span>
          <span className="text-xs text-[rgba(245,245,242,0.4)]">/ {config.totalMax} pts</span>
        </div>
        <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1B6FD9] rounded-full transition-all"
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
      <p className="text-[10px] text-[rgba(245,245,242,0.4)] font-semibold uppercase tracking-wide mb-1">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-3xl font-bold text-[#F5F5F2]">{current}</span>
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
        subtitle="Entry requirements — must be met by start date"
        domains={essentials}
        links={links}
        activeDomainKey={activeDomainKey}
        onSelect={onSelect}
        isEvidenceMode
        onTickAll={unmetCount > 0 ? onTickAllEssentials : undefined}
        tickingAll={tickingAll}
        unmetCount={unmetCount}
      />
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-xs text-[rgba(245,245,242,0.65)] font-semibold uppercase tracking-wide shrink-0">
            Scoring
          </span>
          <span className="text-xs text-[rgba(245,245,242,0.35)] flex-1">
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
          subtitle="Entry requirements — must be met by start date"
          domains={essentials}
          links={links}
          activeDomainKey={activeDomainKey}
          onSelect={onSelect}
          isEvidenceMode
          onTickAll={unmetCount > 0 ? onTickAllEssentials : undefined}
          tickingAll={tickingAll}
          unmetCount={unmetCount}
        />
      )}
      {desirables.length > 0 && (
        <DomainGroup
          title="Desirables"
          subtitle="Application & interview criteria — build evidence over time"
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
        <span className="text-xs text-[rgba(245,245,242,0.65)] font-semibold uppercase tracking-wide shrink-0">
          {title}
        </span>
        <span className="text-xs text-[rgba(245,245,242,0.35)] flex-1">{subtitle}</span>
        {onTickAll && (
          <button
            onClick={onTickAll}
            disabled={tickingAll}
            className="text-xs text-[rgba(245,245,242,0.4)] hover:text-[#1B6FD9] disabled:opacity-50 transition-colors shrink-0"
          >
            {tickingAll ? 'Ticking…' : `Tick all (${unmetCount})`}
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
          ? 'bg-[#1B6FD9]/15 text-[#1B6FD9] border border-[#1B6FD9]/25'
          : 'bg-[#141416] text-[rgba(245,245,242,0.45)] border border-white/[0.06] hover:border-white/[0.14] hover:text-[rgba(245,245,242,0.7)]'
      }`}
    >
      <span>{domain.label}</span>
      {evidenceState !== undefined ? (
        <EvidenceStateBadge state={evidenceState} isActive={isActive} />
      ) : (
        <span
          className={`px-1.5 py-0.5 rounded-md text-xs font-semibold ${
            isActive ? 'bg-[#1B6FD9]/20 text-[#1B6FD9]' : 'bg-white/[0.06] text-[rgba(245,245,242,0.4)]'
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
          isActive ? 'border-[#1B6FD9]/40' : 'border-white/[0.15]'
        }`}
      />
    )
  }
  // met or evidenced — show check
  return (
    <span
      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
        isActive ? 'bg-[#1B6FD9]' : 'bg-[#1B6FD9]/80'
      }`}
    >
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#0B0B0C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
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

  const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://clinidex.co.uk'

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/share')
      if (res.ok) {
        const links: (ShareLinkData & { specialty_key: string })[] = await res.json()
        const match = links.find(l => l.specialty_key === specialtyKey)
        setLink(match ?? null)
      }
      setLoading(false)
    }
    load()
  }, [specialtyKey])

  async function handleGenerate() {
    setGenerating(true)
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ specialty_key: specialtyKey }),
    })
    if (res.ok) {
      const data = await res.json()
      setLink(data)
    }
    setGenerating(false)
  }

  async function handleRevoke() {
    if (!link) return
    if (!confirm('Revoke this link? Anyone using it will lose access immediately.')) return
    setRevoking(true)
    const res = await fetch(`/api/share?id=${link.id}`, { method: 'DELETE' })
    if (res.ok) setLink(null)
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
      <div className="relative bg-[#141416] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-5 gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#F5F5F2]">Share read-only link</h2>
            <p className="text-xs text-[rgba(245,245,242,0.4)] mt-0.5">
              Anyone with the link can view your evidence — no account needed.
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 text-[rgba(245,245,242,0.3)] hover:text-[#F5F5F2] transition-colors mt-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-[#1B6FD9] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : link ? (
          <div className="space-y-4">
            {/* URL display */}
            <div className="bg-[#0B0B0C] border border-white/[0.08] rounded-xl p-3">
              <p className="text-xs font-mono text-[rgba(245,245,242,0.5)] truncate">{url}</p>
            </div>
            <p className="text-xs text-[rgba(245,245,242,0.4)]">Expires {expiresFormatted} · Read-only</p>
            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[rgba(245,245,242,0.7)] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg transition-colors"
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
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[rgba(245,245,242,0.7)] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg transition-colors"
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
            <p className="text-xs text-[rgba(245,245,242,0.3)] text-center">
              Manage all shared links in{' '}
              <a href="/settings/shared-links" className="text-[rgba(245,245,242,0.5)] hover:text-[#F5F5F2] underline transition-colors">
                Settings → Shared links
              </a>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-[#0B0B0C] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span className="text-xs text-[rgba(245,245,242,0.4)]">Link expires after 30 days</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span className="text-xs text-[rgba(245,245,242,0.4)]">Read-only — no login required</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
                <span className="text-xs text-[rgba(245,245,242,0.4)]">Revoke at any time</span>
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-50 text-[#0B0B0C] font-semibold text-sm rounded-xl transition-colors"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#0B0B0C]/30 border-t-[#0B0B0C] rounded-full animate-spin" />
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
