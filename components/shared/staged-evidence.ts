'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api-fetch'
import { deleteEvidenceFile } from '@/lib/supabase/storage'
import { planEvidenceOperations, stagedEvidenceSignature, type RemovalMode } from '@/lib/evidence/staged'

export type StagedAttach = { id: string; file_name: string; file_size: number }

/** Form-local staging for evidence attach / unlink / delete (see lib/evidence/staged.ts). */
export function useStagedEvidence() {
  const [attach, setAttach] = useState<StagedAttach[]>([])
  const [removals, setRemovals] = useState<Record<string, RemovalMode>>({})

  return {
    attach,
    removals,
    stageAttach(file: StagedAttach) {
      setAttach(prev => (prev.some(item => item.id === file.id) ? prev : [...prev, file]))
    },
    unstageAttach(fileId: string) {
      setAttach(prev => prev.filter(item => item.id !== fileId))
    },
    stageRemoval(fileId: string, mode: RemovalMode | null) {
      setRemovals(prev => {
        const next = { ...prev }
        if (mode) next[fileId] = mode
        else delete next[fileId]
        return next
      })
    },
    signature: stagedEvidenceSignature(attach.map(item => item.id), removals),
    hasChanges: attach.length > 0 || Object.keys(removals).length > 0,
  }
}

/**
 * Apply staged changes after the entry itself has saved. Uses the existing
 * owner-checked paths: POST/DELETE /api/evidence/link (unlink deletes the file
 * only when it was the last link) and deleteEvidenceFile for "Delete file
 * everywhere". Returns a list of human-readable failures (empty = all done).
 */
export async function applyStagedEvidence(
  entryId: string,
  entryType: 'portfolio' | 'case',
  attach: StagedAttach[],
  removals: Record<string, RemovalMode>,
): Promise<string[]> {
  const errors: string[] = []
  const names = new Map(attach.map(item => [item.id, item.file_name]))
  for (const operation of planEvidenceOperations(attach.map(item => item.id), removals)) {
    if (operation.op === 'delete') {
      const { error } = await deleteEvidenceFile(operation.fileId)
      if (error) errors.push('a file could not be deleted')
    } else if (operation.op === 'unlink') {
      const params = new URLSearchParams({ fileId: operation.fileId, entryId, entryType })
      const res = await apiFetch(`/api/evidence/link?${params.toString()}`, { method: 'DELETE' })
      if (!res.ok) errors.push('a file could not be unlinked')
    } else {
      const res = await apiFetch('/api/evidence/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: operation.fileId, entryId, entryType }),
      })
      // 409 = already attached, which is the state the user asked for.
      if (!res.ok && res.status !== 409) errors.push(`${names.get(operation.fileId) ?? 'a file'} could not be attached`)
    }
  }
  return errors
}
