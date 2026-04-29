'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ARCP_CATEGORY_LABELS, type ARCPCapability, type ARCPEntryLink, type ARCPCategory } from '@/lib/types/arcp'
import CapabilityRow from './capability-row'

const CATEGORY_ORDER: ARCPCategory[] = ['clinical', 'safety', 'professional', 'development']

type Props = {
  capabilities: ARCPCapability[]
  initialLinks: ARCPEntryLink[]
}

export default function ARCPPageClient({ capabilities, initialLinks }: Props) {
  const router = useRouter()
  const [links, setLinks] = useState<ARCPEntryLink[]>(initialLinks)

  function handleLinked(newLink: ARCPEntryLink) {
    setLinks(prev => [...prev, newLink])
  }

  function handleUnlinked(linkId: string) {
    setLinks(prev => prev.filter(l => l.id !== linkId))
    router.refresh()
  }

  const grouped = CATEGORY_ORDER.reduce<Record<ARCPCategory, ARCPCapability[]>>((acc, cat) => {
    acc[cat] = capabilities.filter(c => c.category === cat)
    return acc
  }, {} as Record<ARCPCategory, ARCPCapability[]>)

  const totalLinked = capabilities.filter(cap =>
    links.some(l => l.capability_key === cap.capability_key)
  ).length
  const hasEvidence = (capabilityKey: string) => links.some(link => link.capability_key === capabilityKey)

  return (
    <>
      {/* Progress summary */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-[#141416] border border-white/[0.06] rounded-xl">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[rgba(245,245,242,0.45)]">Capabilities evidenced</span>
            <span className="text-xs font-mono text-[rgba(245,245,242,0.55)]">{totalLinked} / {capabilities.length}</span>
          </div>
          <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1B6FD9] rounded-full transition-all"
              style={{ width: capabilities.length > 0 ? `${(totalLinked / capabilities.length) * 100}%` : '0%' }}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {CATEGORY_ORDER.map(cat => {
              const total = capabilities.filter(c => c.category === cat).length
              const linked = capabilities.filter(c => c.category === cat && hasEvidence(c.capability_key)).length
              const pct = total > 0 ? Math.round((linked / total) * 100) : 0
              return (
                <div key={cat}>
                  <div className="mb-1 flex justify-between text-xs text-white/50">
                    <span>{ARCP_CATEGORY_LABELS[cat]}</span>
                    <span>{linked}/{total}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#1B6FD9] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <a
          href="https://www.fparcp.co.uk/employers/curriculum"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs text-[rgba(245,245,242,0.3)] hover:text-[rgba(245,245,242,0.6)] transition-colors flex items-center gap-1"
        >
          FP Curriculum
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      </div>

      {/* Capabilities grouped by category */}
      <div className="space-y-8">
        {CATEGORY_ORDER.map(cat => {
          const caps = grouped[cat]
          if (!caps || caps.length === 0) return null
          const catLinked = caps.filter(cap => links.some(l => l.capability_key === cap.capability_key)).length

          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-[rgba(245,245,242,0.55)] uppercase tracking-wider">
                  {ARCP_CATEGORY_LABELS[cat]}
                </h2>
                <span className="text-xs text-[rgba(245,245,242,0.3)] font-mono">{catLinked}/{caps.length}</span>
              </div>
              <div className="space-y-2">
                {caps.map(cap => (
                  <CapabilityRow
                    key={cap.capability_key}
                    capability={cap}
                    links={links.filter(l => l.capability_key === cap.capability_key)}
                    onLinked={handleLinked}
                    onUnlinked={handleUnlinked}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
