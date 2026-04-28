'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  SPECIALTY_CONFIGS,
  isEvidenceBased,
  getEssentialDomains,
  getDesirableDomains,
  getTrainingLevel,
} from '@/lib/specialties'
import type { SpecialtyApplication, SpecialtyConfig } from '@/lib/specialties'

const FREE_SPECIALTY_LIMIT = 1

type Props = {
  onClose: () => void
  onAdd: (app: SpecialtyApplication) => void
  existingKeys: string[]
  isPro?: boolean
}

export function AddSpecialtyModal({ onClose, onAdd, existingKeys, isPro = false }: Props) {
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
  const entryLevel = available.filter(c => getTrainingLevel(c) === 'entry')
  const higherLevel = available.filter(c => getTrainingLevel(c) === 'higher')

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

      // Auto-populate application window deadlines if the config has verified dates
      const config = SPECIALTY_CONFIGS.find(c => c.key === key)
      if (config?.applicationWindow) {
        const { opensDate, closesDate } = config.applicationWindow
        await supabase.from('deadlines').insert([
          {
            user_id: user.id,
            title: `${config.name} applications open`,
            due_date: opensDate,
            completed: false,
            is_auto: true,
            source_specialty_key: key,
          },
          {
            user_id: user.id,
            title: `${config.name} applications close`,
            due_date: closesDate,
            completed: false,
            is_auto: true,
            source_specialty_key: key,
          },
        ])
      }

      onAdd(inserted as SpecialtyApplication)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add specialty')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[8vh] bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="add-specialty-title" className="bg-[#141416] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[84vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08] flex-shrink-0">
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
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {!isPro && existingKeys.length >= FREE_SPECIALTY_LIMIT ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#1B6FD9]/10 border border-[#1B6FD9]/20 flex items-center justify-center mx-auto">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1B6FD9" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#F5F5F2] mb-1">Upgrade to Pro</p>
                <p className="text-xs text-[rgba(245,245,242,0.45)] max-w-xs mx-auto leading-relaxed">
                  Free accounts can track one specialty. Upgrade to Pro to add more specialty trackers.
                </p>
              </div>
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 bg-[#1B6FD9] hover:bg-[#3884DD] text-white text-sm font-medium rounded-xl px-5 py-2.5 transition-colors"
              >
                Coming soon
              </button>
            </div>
          ) : available.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[rgba(245,245,242,0.4)] text-sm">
                You&apos;ve added all available specialties.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-xs text-[rgba(245,245,242,0.4)]">
                Select a specialty to begin tracking your application score.
                {!isPro && (
                  <span className="ml-1 text-[rgba(245,245,242,0.3)]">
                    ({existingKeys.length}/{FREE_SPECIALTY_LIMIT} free slots used)
                  </span>
                )}
              </p>
              {entryLevel.length > 0 && (
                <SpecialtyGroup
                  title="Entry training (ST1 / CT1)"
                  subtitle="Direct from Foundation"
                  configs={entryLevel}
                  loading={loading}
                  onSelect={handleSelect}
                />
              )}
              {higherLevel.length > 0 && (
                <SpecialtyGroup
                  title="Higher specialty (ST3 / ST4)"
                  subtitle="Post-IMT, post-CST or post-ACCS"
                  configs={higherLevel}
                  loading={loading}
                  onSelect={handleSelect}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SpecialtyGroup({
  title,
  subtitle,
  configs,
  loading,
  onSelect,
}: {
  title: string
  subtitle: string
  configs: SpecialtyConfig[]
  loading: boolean
  onSelect: (key: string, cycleYear: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between px-1">
        <span className="text-[10px] font-semibold text-[rgba(245,245,242,0.55)] uppercase tracking-wider">
          {title}
        </span>
        <span className="text-[10px] text-[rgba(245,245,242,0.3)]">
          {subtitle}
        </span>
      </div>
      <div className="space-y-2">
        {configs.map(config => (
          <SpecialtyCard
            key={config.key}
            config={config}
            loading={loading}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

function SpecialtyCard({
  config,
  loading,
  onSelect,
}: {
  config: SpecialtyConfig
  loading: boolean
  onSelect: (key: string, cycleYear: number) => void
}) {
  const evidenceBased = isEvidenceBased(config)
  const essentialsCount = getEssentialDomains(config).length
  const desirablesCount = getDesirableDomains(config).length
  return (
    <button
      onClick={() => onSelect(config.key, config.cycleYear)}
      disabled={loading}
      className="w-full flex items-start justify-between p-4 bg-[#0B0B0C] border border-white/[0.08] hover:border-white/[0.16] rounded-xl transition-all text-left disabled:opacity-50 group"
    >
      <div>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
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
          {evidenceBased && (
            <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[rgba(245,245,242,0.55)] text-xs border border-white/[0.08]">
              Evidence-based
            </span>
          )}
        </div>
        <p className="text-xs text-[rgba(245,245,242,0.4)]">
          {evidenceBased
            ? `${essentialsCount} essentials · ${desirablesCount} desirables`
            : `Up to ${config.totalMax} pts · ${config.domains.length} domains`}
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
  )
}
