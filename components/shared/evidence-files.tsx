'use client'

import { useEffect, useState } from 'react'
import { getSignedUrl, deleteEvidenceFile, type EvidenceFile } from '@/lib/supabase/storage'
import { apiFetch } from '@/lib/api-fetch'
import { useToast } from '@/components/ui/toast-provider'
import ImageLightbox, { type LightboxImage } from '@/components/ui/image-lightbox'
import { formatFileSize } from '@/lib/utils/file-size'
import type { RemovalMode } from '@/lib/evidence/staged'

type EvidenceFileItem = EvidenceFile & { linkCount?: number }

export default function EvidenceFiles({
  initialFiles,
  canDelete = false,
  entryId,
  entryType,
  stagedRemovals,
  onStageRemoval,
}: {
  initialFiles: EvidenceFileItem[]
  canDelete?: boolean
  // When provided, "Unlink from this entry" removes the file from THIS entry
  // only (the physical file is deleted only when it was the last link), and
  // "Delete file everywhere" removes the file from every entry. Without them,
  // removing falls back to the legacy hard-delete of the whole file.
  entryId?: string
  entryType?: 'portfolio' | 'case'
  // Edit forms pass these to STAGE the removal; it is applied on "Save
  // changes" and discarded by Cancel. Without them the action is immediate.
  stagedRemovals?: Record<string, RemovalMode>
  onStageRemoval?: (fileId: string, mode: RemovalMode | null) => void
}) {
  const { addToast } = useToast()
  const [files, setFiles] = useState<EvidenceFileItem[]>(initialFiles)
  // Re-sync when the server sends a different file list (router.refresh()
  // after "Attach an existing file"): useState alone ignored the new prop, so
  // the attached file only appeared after a full reload and users re-attached
  // it (409). Adjust-state-during-render keeps local removals otherwise.
  const initialKey = initialFiles.map(f => f.id).join(',')
  const [syncedKey, setSyncedKey] = useState(initialKey)
  if (initialKey !== syncedKey) {
    setSyncedKey(initialKey)
    setFiles(initialFiles)
  }
  const [downloading, setDownloading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  // Signed URLs for image previews (loaded once on mount)
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    const imageFiles = initialFiles.filter(f => f.mime_type?.startsWith('image/') && (f.scan_status ?? 'clean') === 'clean')
    if (imageFiles.length === 0) return
    let cancelled = false
    ;(async () => {
      const urls: Record<string, string> = {}
      for (const f of imageFiles) {
        const url = await getSignedUrl(f.file_path)
        if (url) urls[f.id] = url
      }
      if (!cancelled) setPreviewUrls(urls)
    })()
    return () => { cancelled = true }
  }, [initialKey]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDownload(file: EvidenceFileItem) {
    if ((file.scan_status ?? 'clean') !== 'clean') return
    setDownloading(file.id)
    // Request the signed URL with the original filename so Supabase serves it
    // as an attachment named correctly (not inline, not the UUID object key).
    const url = await getSignedUrl(file.file_path, file.file_name)
    if (url) {
      const a = document.createElement('a')
      a.href = url
      a.download = file.file_name
      a.click()
    } else {
      addToast('Could not download that file. Please try again.', 'error')
    }
    setDownloading(null)
  }

  const canUnlink = Boolean(entryId && entryType)

  const staged = Boolean(onStageRemoval)
  const entryNoun = entryType === 'case' ? 'case' : 'entry'

  async function handleRemove(file: EvidenceFileItem, mode: RemovalMode) {
    setConfirmDeleteId(null)
    if (onStageRemoval) {
      onStageRemoval(file.id, mode)
      return
    }
    setDeleting(file.id)

    if (canUnlink && mode === 'unlink') {
      const params = new URLSearchParams({ fileId: file.id, entryId: entryId!, entryType: entryType! })
      const res = await apiFetch<{ deleted: boolean }>(`/api/evidence/link?${params.toString()}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setFiles(prev => prev.filter(f => f.id !== file.id))
        addToast(res.data?.deleted ? 'File removed and deleted.' : 'File removed from this entry.', 'success')
      } else {
        addToast('Could not remove that file. Please try again.', 'error')
      }
      setDeleting(null)
      return
    }

    // Delete file everywhere (or no entry context): hard-delete the whole file.
    const { error } = await deleteEvidenceFile(file.id)
    if (!error) {
      setFiles(prev => prev.filter(f => f.id !== file.id))
    } else {
      addToast('Could not remove that file. Please try again.', 'error')
    }
    setDeleting(null)
  }

  if (files.length === 0) return null

  const lightboxImages: (LightboxImage & { id: string })[] = files
    .filter(file => previewUrls[file.id])
    .map(file => ({
      id: file.id,
      src: previewUrls[file.id],
      alt: `Preview of ${file.file_name}`,
      name: file.file_name,
    }))

  return (
    <div>
      <p className="text-[10px] font-medium text-[var(--text-emphasis)] uppercase tracking-wider mb-3">
        Evidence ({files.length} {files.length === 1 ? 'file' : 'files'})
      </p>
      <ul className="space-y-2">
        {files.map(file => (
          (() => {
            const status = file.scan_status ?? 'clean'
            const blocked = status !== 'clean'
            const statusLabel = status === 'clean'
              ? file.scan_provider === 'clamav' ? ' - virus scanned' : ' - MIME verified'
              : status === 'quarantined' ? ' - quarantined' : ' - verifying'
            const linkCount = file.linkCount ?? 1
            const sharedAcross = linkCount > 1
            const stagedMode = stagedRemovals?.[file.id] ?? null
            return (
          <li
            key={file.id}
            className={`flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay-faint)] px-3.5 py-2.5 ${stagedMode ? 'opacity-70' : ''}`}
          >
            {previewUrls[file.id] ? (
              <button
                type="button"
                onClick={() => setLightboxIndex(Math.max(0, lightboxImages.findIndex(image => image.id === file.id)))}
                className="flex-shrink-0 rounded border border-[var(--border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                aria-label={`Open preview of ${file.file_name}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrls[file.id]}
                  alt={`Preview of ${file.file_name}`}
                  className="w-9 h-9 rounded object-cover"
                />
              </button>
            ) : (
              <svg className="shrink-0 text-[var(--text-secondary)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-xs text-[var(--text-primary)] truncate ${stagedMode ? 'line-through' : ''}`}>{file.file_name}</p>
              <p className="text-[10px] text-[var(--text-secondary)] font-mono">
                {formatFileSize(file.file_size)}
                {statusLabel}
              </p>
              {stagedMode && (
                <p className="mt-0.5 text-xs text-[var(--warning)]">
                  {stagedMode === 'delete'
                    ? 'Will be deleted everywhere when you save changes'
                    : linkCount <= 1
                      ? `Will be unlinked when you save changes (this is the only ${entryNoun} using it, so the file is deleted too)`
                      : `Will be unlinked from this ${entryNoun} when you save changes`}
                </p>
              )}
            </div>
            {sharedAcross && (
              <span
                className="shrink-0 rounded-full border border-accent/30 bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent-soft-text)]"
                title={`This file is attached to ${linkCount} entries. Removing it here won't delete the others.`}
              >
                Linked to {linkCount}
              </span>
            )}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDownload(file)}
                disabled={downloading === file.id || blocked}
                className="text-xs text-[var(--accent-text)] hover:text-[var(--accent-bright)] transition-colors disabled:opacity-50"
              >
                {blocked ? 'Locked' : downloading === file.id ? 'Getting link...' : 'Download'}
              </button>
              {canDelete && (
                stagedMode ? (
                  <button
                    type="button"
                    onClick={() => onStageRemoval?.(file.id, null)}
                    className="text-xs font-medium text-[var(--accent-text)] hover:underline"
                  >
                    Undo
                  </button>
                ) : confirmDeleteId !== file.id ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(file.id)}
                    disabled={deleting === file.id}
                    className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors disabled:opacity-50"
                  >
                    {deleting === file.id ? 'Removing...' : 'Remove...'}
                  </button>
                ) : null
              )}
            </div>
            {canDelete && confirmDeleteId === file.id && !stagedMode && (
              <div className="flex w-full flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-2">
                {canUnlink && (
                  <button
                    type="button"
                    onClick={() => handleRemove(file, 'unlink')}
                    className="min-h-[36px] rounded-lg border border-[var(--border-default)] px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                    title={linkCount <= 1 ? `This is the only ${entryNoun} using this file, so unlinking also deletes it.` : `The file stays attached to its other ${linkCount - 1 === 1 ? 'entry' : 'entries'}.`}
                  >
                    Unlink from this {entryNoun}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(file, 'delete')}
                  className="min-h-[36px] rounded-lg border border-[var(--danger)] px-3 text-xs font-medium text-[var(--danger)] hover:bg-red-500/10"
                >
                  Delete file everywhere
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="min-h-[36px] px-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <p className="w-full text-xs text-[var(--text-muted)]">
                  {canUnlink
                    ? sharedAcross
                      ? `Unlinking keeps the file on its other ${linkCount - 1 === 1 ? 'entry' : 'entries'}. Deleting removes it from all ${linkCount}.`
                      : `This is the only ${entryNoun} using this file, so either option deletes it.`
                    : 'Deleting removes the file from every entry and case it is attached to.'}
                  {staged ? ' Nothing changes until you save.' : ''}
                </p>
              </div>
            )}
          </li>
            )
          })()
        ))}
      </ul>
      {lightboxIndex !== null && (
        <ImageLightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
