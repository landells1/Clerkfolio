'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { ARCPCapability, ARCPEntryLink } from '@/lib/types/arcp'
import LinkARCPEvidenceModal from './link-arcp-evidence-modal'
import { useToast } from '@/components/ui/toast-provider'

type Props = {
  capability: ARCPCapability
  links: ARCPEntryLink[]
  onLinked: (link: ARCPEntryLink) => void
  onUnlinked: (linkId: string) => void
}

type LinkedEntry = {
  id: string
  title: string
  date: string
  type: 'portfolio' | 'case'
  category?: string
}

export default function CapabilityRow({ capability, links, onLinked, onUnlinked }: Props) {
  const supabase = createClient()
  const { addToast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [entryDetails, setEntryDetails] = useState<LinkedEntry[] | null>(null)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [unlinking, setUnlinking] = useState<string | null>(null)

  const hasLinks = links.length > 0

  async function handleExpand() {
    if (!expanded && links.length > 0 && entryDetails === null) {
      setLoadingEntries(true)
      const portfolioIds = links.filter(l => l.entry_type === 'portfolio').map(l => l.entry_id)
      const caseIds = links.filter(l => l.entry_type === 'case').map(l => l.entry_id)

      const [portfolioRes, caseRes] = await Promise.all([
        portfolioIds.length > 0
          ? supabase.from('portfolio_entries').select('id, title, date, category').in('id', portfolioIds)
          : Promise.resolve({ data: [] }),
        caseIds.length > 0
          ? supabase.from('cases').select('id, title, date').in('id', caseIds)
          : Promise.resolve({ data: [] }),
      ])

      const details: LinkedEntry[] = [
        ...((portfolioRes.data ?? []).map(e => ({ ...e, type: 'portfolio' as const }))),
        ...((caseRes.data ?? []).map(e => ({ ...e, type: 'case' as const }))),
      ]
      setEntryDetails(details)
      setLoadingEntries(false)
    }
    setExpanded(v => !v)
  }

  async function handleUnlink(linkId: string) {
    setUnlinking(linkId)
    const res = await fetch(`/api/arcp/links?id=${linkId}`, { method: 'DELETE' })
    if (!res.ok) {
      addToast('Failed to unlink evidence', 'error')
    } else {
      setEntryDetails(prev => {
        const link = links.find(l => l.id === linkId)
        if (!prev || !link) return prev
        return prev.filter(e => e.id !== link.entry_id)
      })
      onUnlinked(linkId)
    }
    setUnlinking(null)
  }

  return (
    <div className="bg-[#141416] border border-white/[0.06] rounded-xl overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={handleExpand}
      >
        {/* Evidenced indicator */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${hasLinks ? 'bg-emerald-400' : 'bg-white/[0.12]'}`} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#F5F5F2] truncate">{capability.name}</p>
          {capability.description && (
            <p className="text-xs text-[rgba(245,245,242,0.4)] mt-0.5 line-clamp-1">{capability.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasLinks && (
            <span className="text-xs text-[rgba(245,245,242,0.4)] font-mono">{links.length} linked</span>
          )}
          <button
            onClick={e => { e.stopPropagation(); setModalOpen(true) }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1B6FD9] hover:text-[#3884DD] bg-[#1B6FD9]/10 hover:bg-[#1B6FD9]/15 border border-[#1B6FD9]/20 rounded-lg transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Link
          </button>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.3)"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

      {/* Expanded linked entries */}
      {expanded && (
        <div className="border-t border-white/[0.04]">
          {loadingEntries ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-4 h-4 border-2 border-[#1B6FD9] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : links.length === 0 ? (
            <div className="px-4 py-5 text-center">
              <p className="text-xs text-[rgba(245,245,242,0.35)]">No evidence linked yet.</p>
              <button
                onClick={() => setModalOpen(true)}
                className="mt-2 text-xs text-[#1B6FD9] hover:text-[#3884DD] transition-colors"
              >
                Link an entry →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {links.map(link => {
                const detail = entryDetails?.find(e => e.id === link.entry_id)
                return (
                  <div key={link.id} className="flex items-center gap-3 px-4 py-2.5 group hover:bg-white/[0.02] transition-colors">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/[0.06] text-[rgba(245,245,242,0.45)] border border-white/[0.08] shrink-0 capitalize">
                      {link.entry_type}
                    </span>
                    <div className="flex-1 min-w-0">
                      {detail ? (
                        <Link
                          href={link.entry_type === 'portfolio' ? `/portfolio/${link.entry_id}` : `/cases/${link.entry_id}`}
                          className="text-sm text-[rgba(245,245,242,0.8)] hover:text-[#F5F5F2] transition-colors truncate block"
                        >
                          {detail.title}
                        </Link>
                      ) : (
                        <p className="text-sm text-[rgba(245,245,242,0.5)] truncate">{link.entry_id.slice(0, 8)}…</p>
                      )}
                      {detail && (
                        <p className="text-[10px] text-[rgba(245,245,242,0.3)] font-mono mt-0.5">
                          {new Date(detail.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleUnlink(link.id)}
                      disabled={unlinking === link.id}
                      className="shrink-0 opacity-0 group-hover:opacity-100 text-[rgba(245,245,242,0.3)] hover:text-red-400 transition-all disabled:opacity-30"
                      title="Remove link"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <LinkARCPEvidenceModal
          capability={capability}
          existingEntryIds={links.map(l => l.entry_id)}
          onClose={() => setModalOpen(false)}
          onLinked={link => { onLinked(link); setEntryDetails(null) }}
        />
      )}
    </div>
  )
}
