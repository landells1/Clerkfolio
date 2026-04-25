'use client'

import { useState } from 'react'
import { getSpecialtyConfig, calculateDomainScore, calculateTotalScore } from '@/lib/specialties'
import type { SpecialtyApplication, SpecialtyEntryLink } from '@/lib/specialties'

type Props = {
  applications: SpecialtyApplication[]
  links: SpecialtyEntryLink[]
}

export function CompareView({ applications, links }: Props) {
  const [leftId, setLeftId] = useState(applications[0]?.id ?? '')
  const [rightId, setRightId] = useState(applications[1]?.id ?? '')

  if (applications.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#141416] border border-white/[0.08] flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="18" /><rect x="14" y="3" width="7" height="18" />
          </svg>
        </div>
        <p className="text-[rgba(245,245,242,0.4)] text-sm">Add at least 2 specialties to compare.</p>
      </div>
    )
  }

  const leftApp = applications.find(a => a.id === leftId)
  const rightApp = applications.find(a => a.id === rightId)
  const leftConfig = leftApp ? getSpecialtyConfig(leftApp.specialty_key) : undefined
  const rightConfig = rightApp ? getSpecialtyConfig(rightApp.specialty_key) : undefined

  const leftLinks = links.filter(l => l.application_id === leftId)
  const rightLinks = links.filter(l => l.application_id === rightId)

  // Collect all unique domain keys from both configs
  const allDomainKeys: string[] = []
  const seenKeys = new Set<string>()
  for (const config of [leftConfig, rightConfig]) {
    if (!config) continue
    for (const domain of config.domains) {
      if (!seenKeys.has(domain.key)) {
        seenKeys.add(domain.key)
        allDomainKeys.push(domain.key)
      }
    }
  }

  const leftTotal = leftApp && leftConfig ? calculateTotalScore(leftConfig, leftApp, leftLinks) : 0
  const rightTotal = rightApp && rightConfig ? calculateTotalScore(rightConfig, rightApp, rightLinks) : 0

  return (
    <div>
      {/* Selector row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-xs text-[rgba(245,245,242,0.4)] font-medium uppercase tracking-wide mb-1.5 block">
            Left specialty
          </label>
          <select
            value={leftId}
            onChange={e => setLeftId(e.target.value)}
            className="w-full bg-[#141416] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9] transition-colors appearance-none"
          >
            {applications.map(app => {
              const config = getSpecialtyConfig(app.specialty_key)
              return (
                <option key={app.id} value={app.id}>
                  {config?.name ?? app.specialty_key} ({app.cycle_year})
                </option>
              )
            })}
          </select>
        </div>
        <div>
          <label className="text-xs text-[rgba(245,245,242,0.4)] font-medium uppercase tracking-wide mb-1.5 block">
            Right specialty
          </label>
          <select
            value={rightId}
            onChange={e => setRightId(e.target.value)}
            className="w-full bg-[#141416] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9] transition-colors appearance-none"
          >
            {applications.map(app => {
              const config = getSpecialtyConfig(app.specialty_key)
              return (
                <option key={app.id} value={app.id}>
                  {config?.name ?? app.specialty_key} ({app.cycle_year})
                </option>
              )
            })}
          </select>
        </div>
      </div>

      {/* Comparison table */}
      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-3 border-b border-white/[0.08]">
          <div className="p-4 text-center">
            <p className="font-semibold text-[#F5F5F2] text-sm">{leftConfig?.name ?? '—'}</p>
            <p className="text-xs text-[rgba(245,245,242,0.35)] mt-0.5">{leftConfig?.cycleYear}</p>
          </div>
          <div className="p-4 text-center border-x border-white/[0.06]">
            <p className="text-xs text-[rgba(245,245,242,0.4)] font-medium uppercase tracking-wide">Domain</p>
          </div>
          <div className="p-4 text-center">
            <p className="font-semibold text-[#F5F5F2] text-sm">{rightConfig?.name ?? '—'}</p>
            <p className="text-xs text-[rgba(245,245,242,0.35)] mt-0.5">{rightConfig?.cycleYear}</p>
          </div>
        </div>

        {/* Domain rows */}
        {allDomainKeys.map((domainKey, idx) => {
          const leftDomain = leftConfig?.domains.find(d => d.key === domainKey)
          const rightDomain = rightConfig?.domains.find(d => d.key === domainKey)

          const leftScore = leftDomain ? calculateDomainScore(leftDomain, leftLinks) : null
          const rightScore = rightDomain ? calculateDomainScore(rightDomain, rightLinks) : null

          const leftHigher = leftScore !== null && rightScore !== null && leftScore > rightScore
          const rightHigher = leftScore !== null && rightScore !== null && rightScore > leftScore

          const domainLabel = leftDomain?.label ?? rightDomain?.label ?? domainKey

          return (
            <div
              key={domainKey}
              className={`grid grid-cols-3 border-b border-white/[0.04] last:border-0 ${idx % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
            >
              <div className={`p-3.5 flex items-center justify-center ${leftHigher ? 'bg-[#1B6FD9]/[0.08]' : ''}`}>
                {leftScore !== null ? (
                  <span className={`text-sm font-semibold ${leftHigher ? 'text-[#1B6FD9]' : 'text-[rgba(245,245,242,0.6)]'}`}>
                    {leftScore} pts
                  </span>
                ) : (
                  <span className="text-xs text-[rgba(245,245,242,0.2)]">—</span>
                )}
              </div>
              <div className="p-3.5 flex items-center justify-center border-x border-white/[0.04]">
                <span className="text-xs text-[rgba(245,245,242,0.45)] text-center leading-snug">{domainLabel}</span>
              </div>
              <div className={`p-3.5 flex items-center justify-center ${rightHigher ? 'bg-[#1B6FD9]/[0.08]' : ''}`}>
                {rightScore !== null ? (
                  <span className={`text-sm font-semibold ${rightHigher ? 'text-[#1B6FD9]' : 'text-[rgba(245,245,242,0.6)]'}`}>
                    {rightScore} pts
                  </span>
                ) : (
                  <span className="text-xs text-[rgba(245,245,242,0.2)]">—</span>
                )}
              </div>
            </div>
          )
        })}

        {/* Total row */}
        <div className="grid grid-cols-3 border-t border-white/[0.1] bg-white/[0.02]">
          <div className={`p-4 flex items-center justify-center ${leftTotal > rightTotal ? 'bg-[#1B6FD9]/[0.08]' : ''}`}>
            <span className={`text-base font-bold ${leftTotal > rightTotal ? 'text-[#1B6FD9]' : 'text-[#F5F5F2]'}`}>
              {leftTotal}
              {leftConfig && (
                <span className="text-xs font-normal text-[rgba(245,245,242,0.35)] ml-1">/ {leftConfig.totalMax}</span>
              )}
            </span>
          </div>
          <div className="p-4 flex items-center justify-center border-x border-white/[0.06]">
            <span className="text-xs text-[rgba(245,245,242,0.4)] font-semibold uppercase tracking-wide">Total</span>
          </div>
          <div className={`p-4 flex items-center justify-center ${rightTotal > leftTotal ? 'bg-[#1B6FD9]/[0.08]' : ''}`}>
            <span className={`text-base font-bold ${rightTotal > leftTotal ? 'text-[#1B6FD9]' : 'text-[#F5F5F2]'}`}>
              {rightTotal}
              {rightConfig && (
                <span className="text-xs font-normal text-[rgba(245,245,242,0.35)] ml-1">/ {rightConfig.totalMax}</span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
