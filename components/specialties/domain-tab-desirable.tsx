'use client'

import type { SpecialtyDomain, SpecialtyEntryLink } from '@/lib/specialties'
import { DomainEvidenceList } from './domain-evidence-list'
import { DomainTabModals, type ModalType } from './domain-tab-modals'

// Desirable evidence-only criteria: a self-marked "Evidenced" toggle plus
// optional supporting evidence. State and persistence handlers live in DomainTab.
export function DesirableDomainTab({
  domain,
  links,
  applicationId,
  specialtyName,
  specialtyKey,
  desirablePending,
  onDesirableCheck,
  openModal,
  setOpenModal,
  onLinked,
  onRemoveLink,
}: {
  domain: SpecialtyDomain
  links: SpecialtyEntryLink[]
  applicationId: string
  specialtyName: string
  specialtyKey: string
  desirablePending: boolean
  onDesirableCheck: () => void
  openModal: ModalType
  setOpenModal: (modal: ModalType) => void
  onLinked: (link: SpecialtyEntryLink) => void
  onRemoveLink: (linkId: string) => void
}) {
  const existingEntryIds = links.filter(l => l.entry_id !== null).map(l => l.entry_id as string)
  // The "Evidenced" checkbox link, if any
  const isEvidenced = links.some(l => l.is_checkbox && l.band_label === 'Evidenced')
  // Linked evidence (excluding the "Evidenced" checkbox link itself)
  const desirableEvidence = links.filter(l => !(l.is_checkbox && l.band_label === 'Evidenced'))

  return (
    <div className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-5 mt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-semibold text-[var(--text-primary)] text-sm truncate">{domain.label}</h2>
          <span className="shrink-0 px-1.5 py-0.5 rounded bg-white/[0.06] text-[var(--text-secondary)] text-xs font-medium border border-white/[0.08]">
            Desirable
          </span>
        </div>
        <span className={`shrink-0 text-xs font-medium flex items-center gap-1 ${
          isEvidenced ? 'text-[var(--accent-text)]' : desirableEvidence.length > 0 ? 'text-[var(--accent-text)]' : 'text-[var(--text-secondary)]'
        }`}>
          {isEvidenced ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Evidenced
            </>
          ) : (
            `${desirableEvidence.length} ${desirableEvidence.length === 1 ? 'entry' : 'entries'}`
          )}
        </span>
      </div>

      {/* Notes */}
      {domain.notes && (
        <div className="flex gap-2 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl mb-4">
          <svg className="shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">{domain.notes}</p>
        </div>
      )}

      {/* Mark as evidenced checkbox */}
      <label
        className={`flex items-start gap-3 p-4 rounded-xl border transition-all mb-4 ${
          desirablePending ? 'opacity-50 cursor-wait' : 'cursor-pointer'
        } ${
          isEvidenced
            ? 'bg-accent/[0.06] border-accent/25'
            : 'bg-[var(--bg-canvas)] border-white/[0.08] hover:border-white/[0.16]'
        }`}
        onClick={() => !desirablePending && onDesirableCheck()}
      >
        <div
          className={`mt-0.5 w-5 h-5 shrink-0 rounded flex items-center justify-center border transition-all ${
            isEvidenced ? 'bg-[var(--accent)] border-[var(--accent)]' : 'bg-transparent border-white/[0.25]'
          }`}
        >
          {isEvidenced && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--bg-canvas)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <span className={`text-sm leading-snug ${isEvidenced ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
          Self-mark evidence for this criterion. Attach a portfolio entry to make it documented evidence.
        </span>
      </label>

      {/* Supporting evidence - optional upload */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-[var(--text-emphasis)] font-medium uppercase tracking-wide">
            Supporting evidence
          </p>
          <p className="text-xs text-[var(--text-secondary)]">Optional</p>
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setOpenModal('link')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-white/[0.12] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/[0.2] text-xs font-medium transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Link existing entry
          </button>
          <button
            onClick={() => setOpenModal('log')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Log new entry
          </button>
        </div>

        {desirableEvidence.length > 0 ? (
          <DomainEvidenceList domain={domain} links={desirableEvidence} onRemove={onRemoveLink} />
        ) : (
          <p className="text-xs text-[var(--text-secondary)] italic">
            Attach a certificate, letter, or portfolio entry as proof if you&apos;d like.
          </p>
        )}
      </div>

      {/* Modals */}
      <DomainTabModals
        openModal={openModal}
        domain={domain}
        applicationId={applicationId}
        specialtyName={specialtyName}
        specialtyKey={specialtyKey}
        existingEntryIds={existingEntryIds}
        onClose={() => setOpenModal(null)}
        onLinked={onLinked}
      />
    </div>
  )
}
