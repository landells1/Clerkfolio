'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculateDomainScore, calculateTotalScore } from '@/lib/specialties'
import type { SpecialtyConfig, SpecialtyApplication, SpecialtyEntryLink } from '@/lib/specialties'
import { DomainTab } from './domain-tab'

type Props = {
  config: SpecialtyConfig
  application: SpecialtyApplication
  links: SpecialtyEntryLink[]
  allLinks: SpecialtyEntryLink[]
  onLinksChange: (links: SpecialtyEntryLink[]) => void
  onApplicationUpdate: (app: SpecialtyApplication) => void
  onBack: () => void
}

export function SpecialtyDetail({
  config,
  application,
  links,
  allLinks,
  onLinksChange,
  onApplicationUpdate,
  onBack,
}: Props) {
  const supabase = createClient()
  const [activeDomainKey, setActiveDomainKey] = useState(config.domains[0]?.key ?? '')
  const [bonusClaimed, setBonusClaimed] = useState(application.bonus_claimed)
  const [togglingBonus, setTogglingBonus] = useState(false)

  const total = calculateTotalScore(config, { ...application, bonus_claimed: bonusClaimed }, links)
  const pct = Math.min((total / config.totalMax) * 100, 100)

  async function handleBonusToggle(optionKey: string) {
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
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-semibold text-[#F5F5F2]">{config.name}</h1>
              <span className="px-2 py-0.5 rounded bg-white/[0.06] text-[rgba(245,245,242,0.45)] text-xs">
                {config.cycleYear}
              </span>
              {!config.isOfficial && (
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20">
                  Unofficial
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-bold text-[#F5F5F2]">{total}</span>
              <span className="text-sm text-[rgba(245,245,242,0.4)]">/ {config.totalMax} pts</span>
            </div>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-[#1B6FD9] rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Bonus options */}
        {config.bonusOptions && config.bonusOptions.length > 0 && (
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
      <div className="overflow-x-auto pb-1 mb-1">
        <div className="flex gap-1 min-w-max">
          {config.domains.map(domain => {
            const score = calculateDomainScore(domain, links)
            const isActive = domain.key === activeDomainKey
            return (
              <button
                key={domain.key}
                onClick={() => setActiveDomainKey(domain.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#1B6FD9]/15 text-[#1B6FD9] border border-[#1B6FD9]/25'
                    : 'bg-[#141416] text-[rgba(245,245,242,0.45)] border border-white/[0.06] hover:border-white/[0.14] hover:text-[rgba(245,245,242,0.7)]'
                }`}
              >
                <span>{domain.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-xs font-semibold ${
                    isActive ? 'bg-[#1B6FD9]/20 text-[#1B6FD9]' : 'bg-white/[0.06] text-[rgba(245,245,242,0.4)]'
                  }`}
                >
                  {score}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Active domain content */}
      {activeDomain && (
        <DomainTab
          domain={activeDomain}
          links={links.filter(l => l.domain_key === activeDomainKey)}
          applicationId={application.id}
          specialtyName={config.name}
          onLinksChange={handleDomainLinksChange}
        />
      )}

      {/* Source citation */}
      <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center gap-2">
        {!config.isOfficial && <span className="text-amber-400">⚠️</span>}
        <p className="text-xs text-[rgba(245,245,242,0.35)]">
          Scoring criteria:{' '}
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
