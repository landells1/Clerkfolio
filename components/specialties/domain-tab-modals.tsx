'use client'

import type { SpecialtyDomain, SpecialtyEntryLink } from '@/lib/specialties'
import { LinkEvidenceModal } from './link-evidence-modal'
import { LogAndLinkModal } from './log-and-link-modal'

export type ModalType = 'link' | 'log' | null

// The link/log modal pair rendered at the end of every domain-tab variant.
export function DomainTabModals({
  openModal,
  domain,
  applicationId,
  specialtyName,
  specialtyKey,
  existingEntryIds,
  onClose,
  onLinked,
}: {
  openModal: ModalType
  domain: SpecialtyDomain
  applicationId: string
  specialtyName: string
  specialtyKey: string
  existingEntryIds: string[]
  onClose: () => void
  onLinked: (link: SpecialtyEntryLink) => void
}) {
  return (
    <>
      {openModal === 'link' && (
        <LinkEvidenceModal
          domain={domain}
          applicationId={applicationId}
          specialtyName={specialtyName}
          existingEntryIds={existingEntryIds}
          onClose={onClose}
          onLinked={link => { onLinked(link); onClose() }}
        />
      )}
      {openModal === 'log' && (
        <LogAndLinkModal
          domain={domain}
          applicationId={applicationId}
          specialtyName={specialtyName}
          specialtyKey={specialtyKey}
          onClose={onClose}
          onLinked={link => { onLinked(link); onClose() }}
        />
      )}
    </>
  )
}
