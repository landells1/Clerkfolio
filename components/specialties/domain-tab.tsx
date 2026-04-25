'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculateDomainScore } from '@/lib/specialties'
import type { SpecialtyDomain, SpecialtyEntryLink } from '@/lib/specialties'
import { DomainEvidenceList } from './domain-evidence-list'
import { LinkEvidenceModal } from './link-evidence-modal'
import { LogAndLinkModal } from './log-and-link-modal'

type Props = {
  domain: SpecialtyDomain
  links: SpecialtyEntryLink[]
  applicationId: string
  specialtyName: string
  onLinksChange: (links: SpecialtyEntryLink[]) => void
}

type ModalType = 'link' | 'log' | null

export function DomainTab({ domain, links, applicationId, specialtyName, onLinksChange }: Props) {
  const supabase = createClient()
  const [openModal, setOpenModal] = useState<ModalType>(null)
  const [checkboxPending, setCheckboxPending] = useState<Set<string>>(new Set())
  const [essentialPending, setEssentialPending] = useState(false)

  const score = calculateDomainScore(domain, links)
  const pct = domain.maxPoints > 0 ? Math.min((score / domain.maxPoints) * 100, 100) : 0

  const isEssential = domain.criteriaType === 'essential'
  const isDesirableEvidence = !isEssential && domain.isEvidenceOnly

  // --- Self-assessed domain ---
  async function handleSelfAssessedChange(bandLabel: string) {
    const band = domain.bands.find(b => b.label === bandLabel)
    const points = band?.points ?? 0

    const existingLink = links[0]

    if (bandLabel === '') {
      if (existingLink) {
        const newLinks = links.filter(l => l.id !== existingLink.id)
        onLinksChange(newLinks)
        await supabase.from('specialty_entry_links').delete().eq('id', existingLink.id)
      }
      return
    }

    if (existingLink) {
      const updated: SpecialtyEntryLink = { ...existingLink, band_label: bandLabel, points_claimed: points }
      onLinksChange([updated])
      await supabase
        .from('specialty_entry_links')
        .update({ band_label: bandLabel, points_claimed: points })
        .eq('id', existingLink.id)
    } else {
      const optimisticId = `temp-${Date.now()}`
      const optimistic: SpecialtyEntryLink = {
        id: optimisticId,
        application_id: applicationId,
        domain_key: domain.key,
        entry_id: null,
        entry_type: null,
        band_label: bandLabel,
        points_claimed: points,
        is_checkbox: false,
        created_at: new Date().toISOString(),
      }
      onLinksChange([optimistic])

      const { data: rows, error } = await supabase
        .from('specialty_entry_links')
        .insert({
          application_id: applicationId,
          domain_key: domain.key,
          entry_id: null,
          entry_type: null,
          band_label: bandLabel,
          points_claimed: points,
          is_checkbox: false,
        })
        .select()

      if (error) {
        console.error('Failed to save self-assessment:', error)
        onLinksChange([])
      } else {
        const inserted = rows?.[0]
        if (inserted) onLinksChange([inserted as SpecialtyEntryLink])
      }
    }
  }

  // --- Checkbox domain (for IMT-style banded checkboxes) ---
  async function handleCheckboxToggle(bandLabel: string, bandPoints: number, checked: boolean) {
    if (checkboxPending.has(bandLabel)) return
    setCheckboxPending(prev => new Set(prev).add(bandLabel))
    if (checked) {
      const optimisticId = `temp-${Date.now()}`
      const optimistic: SpecialtyEntryLink = {
        id: optimisticId,
        application_id: applicationId,
        domain_key: domain.key,
        entry_id: null,
        entry_type: null,
        band_label: bandLabel,
        points_claimed: bandPoints,
        is_checkbox: true,
        created_at: new Date().toISOString(),
      }
      onLinksChange([...links, optimistic])

      const { data: rows, error } = await supabase
        .from('specialty_entry_links')
        .insert({
          application_id: applicationId,
          domain_key: domain.key,
          entry_id: null,
          entry_type: null,
          band_label: bandLabel,
          points_claimed: bandPoints,
          is_checkbox: true,
        })
        .select()

      if (error) {
        console.error('specialty_entry_links insert error:', error)
        alert(`Failed to save: ${error.message}`)
        onLinksChange(links)
      } else {
        const inserted = rows?.[0]
        if (inserted) {
          onLinksChange([...links.filter(l => l.id !== optimisticId), inserted as SpecialtyEntryLink])
        }
      }
    } else {
      const linkToRemove = links.find(l => l.band_label === bandLabel && l.is_checkbox && !l.id.startsWith('temp-'))
      if (!linkToRemove) {
        setCheckboxPending(prev => { const s = new Set(prev); s.delete(bandLabel); return s })
        return
      }
      const newLinks = links.filter(l => l.id !== linkToRemove.id)
      onLinksChange(newLinks)
      await supabase.from('specialty_entry_links').delete().eq('id', linkToRemove.id)
    }
    setCheckboxPending(prev => { const s = new Set(prev); s.delete(bandLabel); return s })
  }

  // --- Essential "I have this" toggle ---
  async function handleEssentialToggle() {
    if (essentialPending) return
    setEssentialPending(true)

    const existingMet = links.find(
      l => l.is_checkbox && l.band_label === 'Met' && !l.id.startsWith('temp-')
    )

    if (existingMet) {
      const newLinks = links.filter(l => l.id !== existingMet.id)
      onLinksChange(newLinks)
      const { error } = await supabase.from('specialty_entry_links').delete().eq('id', existingMet.id)
      if (error) {
        alert(`Failed to remove: ${error.message}`)
        onLinksChange(links)
      }
    } else {
      const optimisticId = `temp-${Date.now()}`
      const optimistic: SpecialtyEntryLink = {
        id: optimisticId,
        application_id: applicationId,
        domain_key: domain.key,
        entry_id: null,
        entry_type: null,
        band_label: 'Met',
        points_claimed: 0,
        is_checkbox: true,
        created_at: new Date().toISOString(),
      }
      onLinksChange([...links, optimistic])

      const { data: rows, error } = await supabase
        .from('specialty_entry_links')
        .insert({
          application_id: applicationId,
          domain_key: domain.key,
          entry_id: null,
          entry_type: null,
          band_label: 'Met',
          points_claimed: 0,
          is_checkbox: true,
        })
        .select()

      if (error) {
        alert(`Failed to save: ${error.message}`)
        onLinksChange(links)
      } else {
        const inserted = rows?.[0]
        if (inserted) {
          onLinksChange([
            ...links.filter(l => l.id !== optimisticId),
            inserted as SpecialtyEntryLink,
          ])
        }
      }
    }

    setEssentialPending(false)
  }

  function handleLinked(newLink: SpecialtyEntryLink) {
    onLinksChange([...links, newLink])
  }

  function handleRemoveLink(linkId: string) {
    onLinksChange(links.filter(l => l.id !== linkId))
  }

  const existingEntryIds = links.filter(l => l.entry_id !== null).map(l => l.entry_id as string)

  // The "Met" checkbox link, if any (for essentials)
  const isMet = links.some(l => l.is_checkbox && l.band_label === 'Met')
  // Linked supporting evidence (excluding the "Met" checkbox link itself)
  const supportingEvidence = links.filter(l => !(l.is_checkbox && l.band_label === 'Met'))

  // ---------- Essential mode ----------
  if (isEssential) {
    return (
      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5 mt-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-semibold text-[#F5F5F2] text-sm truncate">{domain.label}</h2>
            <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
              Essential
            </span>
          </div>
          <span className={`shrink-0 text-xs font-medium flex items-center gap-1 ${
            isMet ? 'text-[#1B6FD9]' : 'text-[rgba(245,245,242,0.35)]'
          }`}>
            {isMet ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Met
              </>
            ) : (
              'Not met'
            )}
          </span>
        </div>

        {/* Notes */}
        {domain.notes && (
          <div className="flex gap-2 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl mb-4">
            <svg className="shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p className="text-xs text-[rgba(245,245,242,0.45)] leading-relaxed">{domain.notes}</p>
          </div>
        )}

        {/* Mark-as-met checkbox */}
        <label
          className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
            essentialPending ? 'opacity-50 cursor-wait' : 'cursor-pointer'
          } ${
            isMet
              ? 'bg-[#1B6FD9]/[0.06] border-[#1B6FD9]/25'
              : 'bg-[#0B0B0C] border-white/[0.08] hover:border-white/[0.16]'
          }`}
          onClick={() => !essentialPending && handleEssentialToggle()}
        >
          <div
            className={`mt-0.5 w-5 h-5 shrink-0 rounded flex items-center justify-center border transition-all ${
              isMet ? 'bg-[#1B6FD9] border-[#1B6FD9]' : 'bg-transparent border-white/[0.25]'
            }`}
          >
            {isMet && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0B0B0C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <span className={`text-sm leading-snug ${isMet ? 'text-[#F5F5F2]' : 'text-[rgba(245,245,242,0.7)]'}`}>
            I have this requirement met (or will have by intended start date).
          </span>
        </label>

        {/* Optional supporting evidence */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[rgba(245,245,242,0.4)] font-medium uppercase tracking-wide">
              Supporting evidence
            </p>
            <p className="text-xs text-[rgba(245,245,242,0.3)]">Optional</p>
          </div>

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setOpenModal('link')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-white/[0.12] text-[rgba(245,245,242,0.7)] hover:text-[#F5F5F2] hover:border-white/[0.2] text-xs font-medium transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Link existing entry
            </button>
            <button
              onClick={() => setOpenModal('log')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-[rgba(245,245,242,0.7)] hover:text-[#F5F5F2] text-xs font-medium transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Log new entry
            </button>
          </div>

          {supportingEvidence.length > 0 ? (
            <DomainEvidenceList domain={domain} links={supportingEvidence} onRemove={handleRemoveLink} />
          ) : (
            <p className="text-xs text-[rgba(245,245,242,0.3)] italic">
              Attach a certificate, letter, or portfolio entry as proof if you'd like.
            </p>
          )}
        </div>

        {/* Modals */}
        {openModal === 'link' && (
          <LinkEvidenceModal
            domain={domain}
            applicationId={applicationId}
            specialtyName={specialtyName}
            existingEntryIds={existingEntryIds}
            onClose={() => setOpenModal(null)}
            onLinked={link => { handleLinked(link); setOpenModal(null) }}
          />
        )}
        {openModal === 'log' && (
          <LogAndLinkModal
            domain={domain}
            applicationId={applicationId}
            specialtyName={specialtyName}
            onClose={() => setOpenModal(null)}
            onLinked={link => { handleLinked(link); setOpenModal(null) }}
          />
        )}
      </div>
    )
  }

  // ---------- Desirable evidence-only mode ----------
  if (isDesirableEvidence) {
    return (
      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5 mt-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-semibold text-[#F5F5F2] text-sm truncate">{domain.label}</h2>
            <span className="shrink-0 px-1.5 py-0.5 rounded bg-white/[0.06] text-[rgba(245,245,242,0.55)] text-xs font-medium border border-white/[0.08]">
              Desirable
            </span>
          </div>
          <span className={`shrink-0 text-xs font-medium ${
            links.length > 0 ? 'text-[#1B6FD9]' : 'text-[rgba(245,245,242,0.35)]'
          }`}>
            {links.length} {links.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {/* Notes */}
        {domain.notes && (
          <div className="flex gap-2 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl mb-4">
            <svg className="shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p className="text-xs text-[rgba(245,245,242,0.45)] leading-relaxed">{domain.notes}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setOpenModal('link')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.12] text-[rgba(245,245,242,0.7)] hover:text-[#F5F5F2] hover:border-white/[0.2] text-sm font-medium transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Link existing evidence
          </button>
          <button
            onClick={() => setOpenModal('log')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1B6FD9] hover:bg-[#155BB0] text-[#0B0B0C] text-sm font-semibold transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Log &amp; link here
          </button>
        </div>

        {/* Evidence list */}
        {links.length > 0 ? (
          <DomainEvidenceList domain={domain} links={links} onRemove={handleRemoveLink} />
        ) : (
          <p className="text-center text-xs text-[rgba(245,245,242,0.3)] py-4">
            No evidence linked yet. Link existing entries or log new evidence above.
          </p>
        )}

        {/* Modals */}
        {openModal === 'link' && (
          <LinkEvidenceModal
            domain={domain}
            applicationId={applicationId}
            specialtyName={specialtyName}
            existingEntryIds={existingEntryIds}
            onClose={() => setOpenModal(null)}
            onLinked={link => { handleLinked(link); setOpenModal(null) }}
          />
        )}
        {openModal === 'log' && (
          <LogAndLinkModal
            domain={domain}
            applicationId={applicationId}
            specialtyName={specialtyName}
            onClose={() => setOpenModal(null)}
            onLinked={link => { handleLinked(link); setOpenModal(null) }}
          />
        )}
      </div>
    )
  }

  // ---------- Existing scored modes (self-assessed / checkbox / banded) ----------
  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5 mt-2">
      {/* Domain header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-[#F5F5F2] text-sm">{domain.label}</h2>
        <span className="text-sm font-semibold text-[#F5F5F2]">
          {score} <span className="text-[rgba(245,245,242,0.4)] font-normal">/ {domain.maxPoints} pts</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-[#1B6FD9] rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Notes */}
      {domain.notes && (
        <div className="flex gap-2 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl mb-4">
          <svg className="shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p className="text-xs text-[rgba(245,245,242,0.45)] leading-relaxed">{domain.notes}</p>
        </div>
      )}

      {/* Self-assessed */}
      {domain.isSelfAssessed && (
        <div>
          <label className="text-xs text-[rgba(245,245,242,0.4)] font-medium mb-2 block uppercase tracking-wide">
            Self-assessment
          </label>
          <select
            value={links[0]?.band_label ?? ''}
            onChange={e => handleSelfAssessedChange(e.target.value)}
            className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9] transition-colors appearance-none"
          >
            <option value="">Not assessed</option>
            {domain.bands.map(band => (
              <option key={band.label} value={band.label}>
                {band.label} ({band.points} pts)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Checkbox */}
      {domain.isCheckbox && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[rgba(245,245,242,0.4)] font-medium uppercase tracking-wide">
              Claimed items
            </p>
            <span className="text-xs text-[rgba(245,245,242,0.4)]">
              {score} / {domain.maxPoints} pts claimed
            </span>
          </div>
          {domain.bands.map(band => {
            const isChecked = links.some(l => l.band_label === band.label)
            const isPending = checkboxPending.has(band.label)
            return (
              <label
                key={band.label}
                className={`flex items-start gap-3 group ${isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                onClick={() => !isPending && handleCheckboxToggle(band.label, band.points, !isChecked)}
              >
                <div
                  className={`mt-0.5 w-5 h-5 shrink-0 rounded flex items-center justify-center border transition-all ${
                    isChecked
                      ? 'bg-[#1B6FD9] border-[#1B6FD9]'
                      : 'bg-transparent border-white/[0.2] group-hover:border-white/[0.4]'
                  }`}
                >
                  {isChecked && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0B0B0C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div className="flex items-start justify-between flex-1 min-w-0">
                  <span className="text-sm text-[rgba(245,245,242,0.7)] group-hover:text-[#F5F5F2] transition-colors leading-snug">
                    {band.label}
                  </span>
                  <span className="ml-3 shrink-0 text-xs font-semibold text-[rgba(245,245,242,0.4)]">
                    {band.points} pts
                  </span>
                </div>
              </label>
            )
          })}
        </div>
      )}

      {/* Normal evidence linking with bands */}
      {!domain.isSelfAssessed && !domain.isCheckbox && (
        <div>
          {/* Scoring bands — tick to quick-claim, or link evidence below */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[rgba(245,245,242,0.4)] font-medium uppercase tracking-wide">Scoring bands</p>
              <p className="text-xs text-[rgba(245,245,242,0.3)]">Tick to claim</p>
            </div>
            <div className="space-y-1">
              {domain.bands.map(band => {
                const isChecked = links.some(l => l.band_label === band.label && l.is_checkbox)
                const isPending = checkboxPending.has(band.label)
                return (
                  <div
                    key={band.label}
                    onClick={() => !isPending && handleCheckboxToggle(band.label, band.points, !isChecked)}
                    className={`flex items-center gap-3 py-1.5 px-2 rounded-lg border border-transparent transition-all ${
                      isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:bg-white/[0.03] hover:border-white/[0.06]'
                    } ${isChecked ? 'bg-[#1B6FD9]/[0.05] border-[#1B6FD9]/20' : ''}`}
                  >
                    <div className={`shrink-0 w-4 h-4 rounded flex items-center justify-center border transition-all ${
                      isChecked ? 'bg-[#1B6FD9] border-[#1B6FD9]' : 'bg-transparent border-white/[0.2]'
                    }`}>
                      {isChecked && (
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#0B0B0C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-xs flex-1 leading-snug ${isChecked ? 'text-[rgba(245,245,242,0.8)]' : 'text-[rgba(245,245,242,0.5)]'}`}>
                      {band.label}
                    </span>
                    <span className={`shrink-0 text-xs font-semibold ${isChecked ? 'text-[#1B6FD9]' : 'text-[rgba(245,245,242,0.35)]'}`}>
                      {band.points} pts
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Separator */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-[rgba(245,245,242,0.25)]">or link evidence</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setOpenModal('link')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.12] text-[rgba(245,245,242,0.7)] hover:text-[#F5F5F2] hover:border-white/[0.2] text-sm font-medium transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Link existing evidence
            </button>
            <button
              onClick={() => setOpenModal('log')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1B6FD9] hover:bg-[#155BB0] text-[#0B0B0C] text-sm font-semibold transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Log &amp; link here
            </button>
          </div>

          {/* Evidence list */}
          {links.length > 0 && (
            <DomainEvidenceList
              domain={domain}
              links={links}
              onRemove={handleRemoveLink}
            />
          )}

          {links.length === 0 && (
            <p className="text-center text-xs text-[rgba(245,245,242,0.3)] py-4">
              No evidence linked yet. Link existing entries or log new evidence above.
            </p>
          )}
        </div>
      )}

      {/* Modals */}
      {openModal === 'link' && (
        <LinkEvidenceModal
          domain={domain}
          applicationId={applicationId}
          specialtyName={specialtyName}
          existingEntryIds={existingEntryIds}
          onClose={() => setOpenModal(null)}
          onLinked={link => { handleLinked(link); setOpenModal(null) }}
        />
      )}
      {openModal === 'log' && (
        <LogAndLinkModal
          domain={domain}
          applicationId={applicationId}
          specialtyName={specialtyName}
          onClose={() => setOpenModal(null)}
          onLinked={link => { handleLinked(link); setOpenModal(null) }}
        />
      )}
    </div>
  )
}
