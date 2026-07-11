'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiFetch, NETWORK_ERROR_MESSAGE } from '@/lib/api-fetch'
import { getSignedUrl, deleteEvidenceFile } from '@/lib/supabase/storage'
import { useToast } from '@/components/ui/toast-provider'
import StorageMeter from '@/components/upgrade/storage-meter'
import type { SubscriptionInfo } from '@/lib/subscription'
import { formatDate } from './shared'

type LibraryLink = {
  entry_id: string
  entry_type: 'portfolio' | 'case'
  /** null = the linked entry is in the trash (title withheld until restored). */
  title: string | null
}

type LibraryFile = {
  id: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string | null
  scan_status: 'pending' | 'scanning' | 'clean' | 'quarantined'
  created_at: string
  links: LibraryLink[]
}

// Base-ten sizes, matching the storage quota units used everywhere else in the
// app (1 MB = 1,000,000 bytes - see lib/entitlements/limits.ts).
function formatFileSize(bytes: number) {
  if (bytes < 1000) return `${bytes} B`
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(1)} KB`
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}

function entryHref(link: LibraryLink) {
  return link.entry_type === 'portfolio' ? `/portfolio/${link.entry_id}` : `/cases/${link.entry_id}`
}

/**
 * Files tab: the owner's evidence library. Every uploaded file with its size,
 * scan status, upload date and the entries/cases it is linked to, plus the
 * storage meter - so a user near the free 100 MB cap can see exactly what is
 * using it and delete files outright. Deleting here removes the file from
 * EVERY entry it is attached to (unlike the per-entry remove, which unlinks);
 * it reuses the existing owner-checked deleteEvidenceFile hard-delete path.
 */
export function FilesTab({
  subInfo,
  onStorageChanged,
}: {
  subInfo: SubscriptionInfo | null
  onStorageChanged: () => void
}) {
  const { addToast } = useToast()
  const [files, setFiles] = useState<LibraryFile[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await apiFetch<{ files: LibraryFile[]; error?: string }>('/api/evidence/files')
      if (cancelled) return
      if (res.ok && res.data?.files) {
        setFiles(res.data.files)
      } else {
        setLoadError(res.status === null ? NETWORK_ERROR_MESSAGE : res.data?.error ?? 'Failed to load your files. Please try again.')
      }
    })()
    return () => { cancelled = true }
  }, [])

  async function handleDownload(file: LibraryFile) {
    if (file.scan_status !== 'clean') return
    setDownloading(file.id)
    const url = await getSignedUrl(file.file_path, file.file_name)
    if (url) {
      const a = document.createElement('a')
      a.href = url
      a.download = file.file_name
      a.click()
    } else {
      addToast('Could not prepare that download. Please try again.', 'error')
    }
    setDownloading(null)
  }

  async function handleDelete(file: LibraryFile) {
    setDeleting(file.id)
    setConfirmDeleteId(null)
    // Existing owner-checked hard delete (storage object + evidence_files row);
    // the evidence_file_links rows cascade with the row, so every entry the
    // file was attached to loses it in one step.
    const { error } = await deleteEvidenceFile(file.id)
    if (!error) {
      setFiles(prev => prev?.filter(f => f.id !== file.id) ?? null)
      addToast('File deleted.', 'success')
      onStorageChanged()
    } else {
      addToast('Could not delete that file. Please try again.', 'error')
    }
    setDeleting(null)
  }

  const usedMB = (files ?? []).reduce((sum, f) => sum + f.file_size, 0) / 1_000_000

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)]">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Your files</h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Every evidence file you have uploaded, and the entries it supports. A file attached to several entries is stored (and counted) once.
        </p>
        {files !== null && subInfo && (
          <StorageMeter usedMB={usedMB} quotaMB={subInfo.storageQuotaMB} className="mt-4 max-w-md" />
        )}
      </div>

      {loadError ? (
        <p role="alert" className="p-6 text-sm text-[var(--danger)]">{loadError}</p>
      ) : files === null ? (
        <p className="p-6 text-sm text-[var(--text-muted)]">Loading your files…</p>
      ) : files.length === 0 ? (
        <div className="p-6">
          <p className="text-sm font-medium text-[var(--text-primary)]">No files uploaded yet</p>
          <p className="mt-1.5 max-w-xl text-sm text-[var(--text-secondary)]">
            Evidence is uploaded from an entry or case form - open one from{' '}
            <Link href="/portfolio" className="text-[var(--accent-text)] underline">your portfolio</Link>
            {' '}or{' '}
            <Link href="/cases" className="text-[var(--accent-text)] underline">your cases</Link>
            {' '}and drop files into its Evidence section. They will all show up here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {files.map(file => {
            const blocked = file.scan_status !== 'clean'
            const linkCount = file.links.length
            const confirmCopy = linkCount === 0
              ? 'Not attached to any entries. Delete this file permanently?'
              : linkCount === 1
                ? 'Attached to 1 entry. Deleting removes it from that entry too, permanently.'
                : `Attached to ${linkCount} entries. Deleting removes it from all of them, permanently.`
            return (
              <li key={file.id} className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 truncate text-sm font-medium text-[var(--text-primary)]">{file.file_name}</p>
                    {file.scan_status === 'quarantined' && (
                      <span className="shrink-0 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-[var(--danger)]">
                        Quarantined
                      </span>
                    )}
                    {(file.scan_status === 'pending' || file.scan_status === 'scanning') && (
                      <span className="shrink-0 rounded-full border border-amber-400/20 bg-amber-400/5 px-2 py-0.5 text-[10px] font-medium text-[var(--warning)]">
                        Verifying
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-[var(--text-secondary)]">
                    {formatFileSize(file.file_size)} · uploaded {formatDate(file.created_at)}
                  </p>
                  {linkCount === 0 ? (
                    <p className="mt-2 text-xs text-[var(--text-muted)]">Not attached to any entries.</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-[var(--text-muted)]">
                        Used by {linkCount} {linkCount === 1 ? 'entry' : 'entries'}:
                      </span>
                      {file.links.map(link => (
                        link.title ? (
                          <Link
                            key={`${link.entry_type}:${link.entry_id}`}
                            href={entryHref(link)}
                            className="max-w-56 truncate rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-accent/40 hover:text-[var(--text-primary)]"
                          >
                            {link.entry_type === 'case' ? 'Case: ' : ''}{link.title}
                          </Link>
                        ) : (
                          <span
                            key={`${link.entry_type}:${link.entry_id}`}
                            className="rounded-full border border-white/[0.06] px-2 py-0.5 text-xs text-[var(--text-muted)]"
                            title="This entry is in your trash. Restore it to see its title."
                          >
                            {link.entry_type === 'case' ? 'Case in trash' : 'Entry in trash'}
                          </span>
                        )
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {confirmDeleteId === file.id ? (
                    <>
                      <span className="w-full text-xs text-[var(--text-secondary)] sm:w-auto sm:max-w-56">{confirmCopy}</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(file)}
                        disabled={deleting === file.id}
                        className="inline-flex min-h-[44px] items-center rounded-lg border border-red-500/20 bg-red-500/10 px-3 text-xs font-medium text-[var(--danger)] disabled:opacity-50"
                      >
                        {deleting === file.id ? 'Deleting…' : 'Delete permanently'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={deleting === file.id}
                        className="inline-flex min-h-[44px] items-center rounded-lg border border-white/[0.08] px-3 text-xs text-[var(--text-secondary)] disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDownload(file)}
                        disabled={downloading === file.id || blocked}
                        className="inline-flex min-h-[44px] items-center rounded-lg border border-white/[0.08] px-3 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
                      >
                        {blocked ? 'Locked' : downloading === file.id ? 'Getting link…' : 'Download'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(file.id)}
                        disabled={deleting === file.id}
                        aria-label={`Delete ${file.file_name}`}
                        className="inline-flex min-h-[44px] items-center rounded-lg border border-red-500/20 px-3 text-xs text-[var(--danger)] transition-colors hover:bg-red-500/10 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
