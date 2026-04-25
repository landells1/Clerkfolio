'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SPECIALTY_CONFIGS } from '@/lib/specialties'
import type { SpecialtyApplication } from '@/lib/specialties'

type Props = {
  onClose: () => void
  onAdd: (app: SpecialtyApplication) => void
  existingKeys: string[]
}

export function AddSpecialtyModal({ onClose, onAdd, existingKeys }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      if (focusable.length === 0) { e.preventDefault(); return }
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const available = SPECIALTY_CONFIGS.filter(c => !existingKeys.includes(c.key))

  async function handleSelect(key: string, cycleYear: number) {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: rows, error: insertError } = await supabase
        .from('specialty_applications')
        .insert({ user_id: user.id, specialty_key: key, cycle_year: cycleYear, bonus_claimed: false })
        .select()

      if (insertError) throw insertError
      const inserted = rows?.[0]
      if (!inserted) throw new Error('No data returned — check your session and try again.')

      onAdd(inserted as SpecialtyApplication)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add specialty')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="add-specialty-title" className="bg-[#141416] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
          <h2 id="add-specialty-title" className="text-lg font-semibold text-[#F5F5F2]">Add Specialty Tracker</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] hover:bg-white/[0.06] transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {available.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[rgba(245,245,242,0.4)] text-sm">
                You&apos;ve added all available specialties.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[rgba(245,245,242,0.4)] mb-4">
                Select a specialty to begin tracking your application score.
              </p>
              {available.map(config => (
                <button
                  key={config.key}
                  onClick={() => handleSelect(config.key, config.cycleYear)}
                  disabled={loading}
                  className="w-full flex items-start justify-between p-4 bg-[#0B0B0C] border border-white/[0.08] hover:border-white/[0.16] rounded-xl transition-all text-left disabled:opacity-50 group"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-[#F5F5F2] text-sm">{config.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[rgba(245,245,242,0.45)] text-xs">
                        {config.cycleYear}
                      </span>
                      {config.isOfficial ? (
                        <span className="px-1.5 py-0.5 rounded bg-[#1B6FD9]/10 text-[#1B6FD9] text-xs border border-[#1B6FD9]/20">
                          Official
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20">
                          Unofficial
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[rgba(245,245,242,0.4)]">
                      Up to {config.totalMax} pts &middot; {config.domains.length} domains
                    </p>
                    {!config.isOfficial && (
                      <p className="text-xs text-amber-400/70 mt-1">⚠️ Verify with official person spec</p>
                    )}
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(245,245,242,0.3)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 mt-0.5 group-hover:stroke-[rgba(245,245,242,0.6)] transition-colors"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
