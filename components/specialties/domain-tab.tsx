'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'
import type { SpecialtyDomain, SpecialtyEntryLink } from '@/lib/specialties'
import { type ModalType } from './domain-tab-modals'
import { EssentialDomainTab } from './domain-tab-essential'
import { DesirableDomainTab } from './domain-tab-desirable'
import { ScoredDomainTab } from './domain-tab-scored'

type Props = {
  domain: SpecialtyDomain
  links: SpecialtyEntryLink[]
  applicationId: string
  specialtyName: string
  specialtyKey: string
  // Updater form: every commit/rollback works on the freshest domain links, so
  // two in-flight band mutations cannot erase each other via stale snapshots
  onLinksChange: (update: (prev: SpecialtyEntryLink[]) => SpecialtyEntryLink[]) => void
}

export function DomainTab({ domain, links, applicationId, specialtyName, specialtyKey, onLinksChange }: Props) {
  const supabase = createClient()
  const { addToast } = useToast()
  const [openModal, setOpenModal] = useState<ModalType>(null)
  const [checkboxPending, setCheckboxPending] = useState<Set<string>>(new Set())
  const [essentialPending, setEssentialPending] = useState(false)
  const [desirablePending, setDesirablePending] = useState(false)

  const isEssential = domain.criteriaType === 'essential'
  const isDesirableEvidence = !isEssential && domain.isEvidenceOnly

  // --- Self-assessed domain ---
  async function handleSelfAssessedChange(bandLabel: string) {
    const band = domain.bands.find(b => b.label === bandLabel)
    const points = band?.points ?? 0

    const existingLink = links[0]

    if (bandLabel === '') {
      if (existingLink) {
        onLinksChange(prev => prev.filter(l => l.id !== existingLink.id))
        const { error } = await supabase.from('specialty_entry_links').delete().eq('id', existingLink.id)
        if (error) {
          addToast('Could not clear this self-assessment. Check your connection and try again.', 'error')
          onLinksChange(prev => [...prev, existingLink])
        }
      }
      return
    }

    if (existingLink) {
      const updated: SpecialtyEntryLink = { ...existingLink, band_label: bandLabel, points_claimed: points }
      onLinksChange(prev => prev.map(l => (l.id === existingLink.id ? updated : l)))
      const { error } = await supabase
        .from('specialty_entry_links')
        .update({ band_label: bandLabel, points_claimed: points })
        .eq('id', existingLink.id)
      if (error) {
        addToast('Could not save this self-assessment. Check your connection and try again.', 'error')
        onLinksChange(prev => prev.map(l => (l.id === existingLink.id ? existingLink : l)))
      }
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
      onLinksChange(prev => [...prev, optimistic])

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
        addToast('Could not save this self-assessment. Check your connection and try again.', 'error')
        onLinksChange(prev => prev.filter(l => l.id !== optimisticId))
      } else {
        const inserted = rows?.[0]
        if (inserted) onLinksChange(prev => prev.map(l => (l.id === optimisticId ? inserted as SpecialtyEntryLink : l)))
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
      onLinksChange(prev => [...prev, optimistic])

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
        addToast('Could not save this specialty evidence. Check your connection and try again.', 'error')
        onLinksChange(prev => prev.filter(l => l.id !== optimisticId))
      } else {
        const inserted = rows?.[0]
        if (inserted) {
          onLinksChange(prev => prev.map(l => (l.id === optimisticId ? inserted as SpecialtyEntryLink : l)))
        }
      }
    } else {
      const linkToRemove = links.find(l => l.band_label === bandLabel && l.is_checkbox && !l.id.startsWith('temp-'))
      if (!linkToRemove) {
        setCheckboxPending(prev => { const s = new Set(prev); s.delete(bandLabel); return s })
        return
      }
      onLinksChange(prev => prev.filter(l => l.id !== linkToRemove.id))
      const { error } = await supabase.from('specialty_entry_links').delete().eq('id', linkToRemove.id)
      if (error) {
        addToast('Could not remove this specialty evidence. Check your connection and try again.', 'error')
        onLinksChange(prev => [...prev, linkToRemove])
      }
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
      onLinksChange(prev => prev.filter(l => l.id !== existingMet.id))
      const { error } = await supabase.from('specialty_entry_links').delete().eq('id', existingMet.id)
      if (error) {
        addToast('Could not remove this specialty evidence. Check your connection and try again.', 'error')
        onLinksChange(prev => [...prev, existingMet])
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
      onLinksChange(prev => [...prev, optimistic])

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
        addToast('Could not save this specialty evidence. Check your connection and try again.', 'error')
        onLinksChange(prev => prev.filter(l => l.id !== optimisticId))
      } else {
        const inserted = rows?.[0]
        if (inserted) {
          onLinksChange(prev => prev.map(l => (l.id === optimisticId ? inserted as SpecialtyEntryLink : l)))
        }
      }
    }

    setEssentialPending(false)
  }

  // --- Desirable evidence-only "Mark as evidenced" toggle ---
  async function handleDesirableCheck() {
    if (desirablePending) return
    setDesirablePending(true)

    const existingEvidenced = links.find(
      l => l.is_checkbox && l.band_label === 'Evidenced' && !l.id.startsWith('temp-')
    )

    if (existingEvidenced) {
      onLinksChange(prev => prev.filter(l => l.id !== existingEvidenced.id))
      const { error } = await supabase.from('specialty_entry_links').delete().eq('id', existingEvidenced.id)
      if (error) {
        addToast('Could not remove this specialty evidence. Check your connection and try again.', 'error')
        onLinksChange(prev => [...prev, existingEvidenced])
      }
    } else {
      const optimisticId = `temp-${Date.now()}`
      const optimistic: SpecialtyEntryLink = {
        id: optimisticId,
        application_id: applicationId,
        domain_key: domain.key,
        entry_id: null,
        entry_type: null,
        band_label: 'Evidenced',
        points_claimed: 0,
        is_checkbox: true,
        created_at: new Date().toISOString(),
      }
      onLinksChange(prev => [...prev, optimistic])

      const { data: rows, error } = await supabase
        .from('specialty_entry_links')
        .insert({
          application_id: applicationId,
          domain_key: domain.key,
          entry_id: null,
          entry_type: null,
          band_label: 'Evidenced',
          points_claimed: 0,
          is_checkbox: true,
        })
        .select()

      if (error) {
        addToast('Could not save this specialty evidence. Check your connection and try again.', 'error')
        onLinksChange(prev => prev.filter(l => l.id !== optimisticId))
      } else {
        const inserted = rows?.[0]
        if (inserted) {
          onLinksChange(prev => prev.map(l => (l.id === optimisticId ? inserted as SpecialtyEntryLink : l)))
        }
      }
    }

    setDesirablePending(false)
  }

  function handleLinked(newLink: SpecialtyEntryLink) {
    onLinksChange(prev => [...prev, newLink])
  }

  function handleRemoveLink(linkId: string) {
    onLinksChange(prev => prev.filter(l => l.id !== linkId))
  }

  // ---------- Essential mode ----------
  if (isEssential) {
    return (
      <EssentialDomainTab
        domain={domain}
        links={links}
        applicationId={applicationId}
        specialtyName={specialtyName}
        specialtyKey={specialtyKey}
        essentialPending={essentialPending}
        onEssentialToggle={handleEssentialToggle}
        openModal={openModal}
        setOpenModal={setOpenModal}
        onLinked={handleLinked}
        onRemoveLink={handleRemoveLink}
      />
    )
  }

  // ---------- Desirable evidence-only mode ----------
  if (isDesirableEvidence) {
    return (
      <DesirableDomainTab
        domain={domain}
        links={links}
        applicationId={applicationId}
        specialtyName={specialtyName}
        specialtyKey={specialtyKey}
        desirablePending={desirablePending}
        onDesirableCheck={handleDesirableCheck}
        openModal={openModal}
        setOpenModal={setOpenModal}
        onLinked={handleLinked}
        onRemoveLink={handleRemoveLink}
      />
    )
  }

  // ---------- Existing scored modes (self-assessed / checkbox / banded) ----------
  return (
    <ScoredDomainTab
      domain={domain}
      links={links}
      applicationId={applicationId}
      specialtyName={specialtyName}
      specialtyKey={specialtyKey}
      checkboxPending={checkboxPending}
      onCheckboxToggle={handleCheckboxToggle}
      onSelfAssessedChange={handleSelfAssessedChange}
      openModal={openModal}
      setOpenModal={setOpenModal}
      onLinked={handleLinked}
      onRemoveLink={handleRemoveLink}
    />
  )
}
