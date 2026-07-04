'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'
import {
  SPECIALTY_CONFIGS,
  isEvidenceBased,
  getEssentialDomains,
  getDesirableDomains,
  PRE_INTERVIEW_GATE_ORDER,
} from '@/lib/specialties'
import type { SpecialtyApplication, SpecialtyConfig, PreInterviewGate } from '@/lib/specialties'
import { SelectionProcessStrip } from './selection-process-strip'
import { fetchSubscriptionInfo } from '@/lib/subscription'

const FREE_SPECIALTY_LIMIT = 1

// Groups follow the pre-interview gate ("how do you get in the door"), not the
// broader selection-process family: specialties in one group share the same
// shortlisting mechanism and the same annual-refresh recipe.
const GATE_GROUP_META: Record<PreInterviewGate, { title: string; subtitle: string }> = {
  self_assessment_rank: {
    title: 'Your self-assessment score gets you the interview',
    subtitle: 'Score yourself against a published points matrix; the score ranks you.',
  },
  assessor_scored_written: {
    title: 'Assessors score your written application',
    subtitle: 'Independent assessors score written answers to decide who is interviewed.',
  },
  msra_rank: {
    title: 'The MSRA gets you the interview',
    subtitle: 'The MSRA ranks candidates for interview; portfolio evidence counts at the interview.',
  },
  msra_is_selection: {
    title: 'The MSRA is the whole selection (this cycle)',
    subtitle: 'No interview this cycle; offers ranked on MSRA scores alone. May change next cycle.',
  },
  cognitive_tests: {
    title: 'Cognitive tests then a selection centre',
    subtitle: 'Specialty-specific reasoning and judgement tests gate a selection-centre stage.',
  },
  none_all_eligible: {
    title: 'No shortlisting gate',
    subtitle: 'Every eligible applicant is invited to interview.',
  },
}

type Props = {
  onClose: () => void
  onAdd: (app: SpecialtyApplication) => void
  existingKeys: string[]
  activeCount: number
  canTrackAnotherSpecialty?: boolean
}

export function AddSpecialtyModal({ onClose, onAdd, existingKeys, activeCount, canTrackAnotherSpecialty = false }: Props) {
  const supabase = createClient()
  const { addToast } = useToast()
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
  const gateGroups = PRE_INTERVIEW_GATE_ORDER.map(gate => ({
    gate,
    configs: available.filter(c => c.selectionProcess?.preInterview?.gate === gate),
  })).filter(g => g.configs.length > 0)
  const uncategorised = available.filter(c => !c.selectionProcess?.preInterview)

  async function handleSelect(key: string, cycleYear: number) {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const subInfo = await fetchSubscriptionInfo(supabase, user.id)
      if (!subInfo.limits.canTrackAnotherSpecialty) {
        throw new Error('Free accounts can track one specialty. Upgrade to Pro to add more specialty trackers.')
      }

      const { data: rows, error: insertError } = await supabase
        .from('specialty_applications')
        .insert({ user_id: user.id, specialty_key: key, cycle_year: cycleYear, bonus_claimed: false })
        .select()

      if (insertError) throw insertError
      const inserted = rows?.[0]
      if (!inserted) throw new Error('No data returned - check your session and try again.')

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
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="add-specialty-title" className="bg-[var(--bg-surface)] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[84vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08] flex-shrink-0">
          <h2 id="add-specialty-title" className="text-lg font-semibold text-[var(--text-primary)]">Add Specialty Tracker</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] transition-all"
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

          {!canTrackAnotherSpecialty ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--accent)' }} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Upgrade to Pro</p>
                <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">
                  Free accounts can track one specialty. Upgrade to Pro to add more specialty trackers.
                </p>
              </div>
              <button
                onClick={() => { window.location.href = '/upgrade' }}
                className="inline-flex items-center gap-2 bg-[var(--button-primary-bg)] hover:bg-[var(--accent-bright)] text-[var(--button-primary-text)] text-sm font-medium rounded-xl px-5 py-2.5 transition-colors"
              >
                View Pro plan
              </button>
            </div>
          ) : available.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[var(--text-muted)] text-sm">
                You&apos;ve added all available specialties.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-xs text-[var(--text-muted)]">
                Select a specialty to begin tracking your application score.
                {!canTrackAnotherSpecialty && (
                  <span className="ml-1 text-[var(--text-secondary)]">
                    ({activeCount}/{FREE_SPECIALTY_LIMIT} free slots used)
                  </span>
                )}
              </p>
              {gateGroups.map(({ gate, configs }) => (
                <SpecialtyGroup
                  key={gate}
                  title={GATE_GROUP_META[gate].title}
                  subtitle={GATE_GROUP_META[gate].subtitle}
                  configs={configs}
                  loading={loading}
                  onSelect={handleSelect}
                />
              ))}
              {uncategorised.length > 0 && (
                <SpecialtyGroup
                  title="Other"
                  subtitle="Shortlisting gate not yet documented."
                  configs={uncategorised}
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
      <div className="px-1">
        <p className="text-[10px] font-semibold text-[var(--text-emphasis)] uppercase tracking-wider">
          {title}
        </p>
        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
          {subtitle}
        </p>
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
      className="w-full flex items-start justify-between p-4 bg-[var(--bg-canvas)] border border-white/[0.08] hover:border-white/[0.16] rounded-xl transition-all text-left disabled:opacity-50 group"
    >
      <div>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-semibold text-[var(--text-primary)] text-sm">{config.name}</span>
          <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[var(--text-muted)] text-xs">
            {config.cycleYear}
          </span>
          {config.isOfficial ? (
            <span className="px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent-soft-text)] text-xs border border-accent/30">
              Official
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20">
              Unofficial
            </span>
          )}
          {evidenceBased && (
            <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[var(--text-secondary)] text-xs border border-white/[0.08]">
              Evidence-based
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          {evidenceBased
            ? `${essentialsCount} essentials - ${desirablesCount} desirables`
            : `Up to ${config.totalMax} pts - ${config.domains.filter(d => d.criteriaType !== 'essential').length} domains`}
        </p>
        <SelectionProcessStrip process={config.selectionProcess} variant="compact" />
        {!config.isOfficial && (
          <p className="text-xs text-amber-400/70 mt-1">⚠️ Verify with official person spec</p>
        )}
      </div>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--text-secondary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 mt-0.5 group-hover:stroke-[var(--text-secondary)] transition-colors"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  )
}
