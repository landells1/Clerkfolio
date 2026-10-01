'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api-fetch'
import { useToast } from '@/components/ui/toast-provider'
import { formatFileSize } from '@/lib/utils/file-size'
import type { StagedAttach } from '@/components/shared/staged-evidence'

type OwnedFile = {
  id: string
  file_name: string
  file_size: number
  scan_status: string
  links: { entry_id: string; entry_type: 'portfolio' | 'case'; title: string | null }[]
}

/**
 * "Attach an existing file" picker (evidence reuse), used by the entry and
 * case EDIT forms. Picking a file only STAGES the attachment - it is applied
 * by "Save changes" and discarded by Cancel (components/shared/staged-evidence).
 *
 * Lists the owner's clean files with the titles of the entries/cases each is
 * already attached to, from the owner-only GET /api/evidence/files (the same
 * data as the Files tab). Every title shown belongs to the signed-in user, so
 * naming them leaks nothing - it just answers "which entry is that?".
 */
export default function AttachExistingEvidence({
  entryId,
  entryType,
  stagedIds,
  onStage,
}: {
  entryId: string
  entryType: 'portfolio' | 'case'
  stagedIds: string[]
  onStage: (file: StagedAttach) => void
}) {
  const { addToast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<OwnedFile[] | null>(null)

  async function openPicker() {
    setOpen(true)
    if (files) return
    setLoading(true)
    const res = await apiFetch<{ files: OwnedFile[] }>('/api/evidence/files')
    setLoading(false)
    if (res.ok && res.data?.files) {
      setFiles(res.data.files.filter(file => file.scan_status === 'clean'))
    } else {
      addToast('Could not load your files. Please try again.', 'error')
      setOpen(false)
    }
  }

  const available = (files ?? []).filter(file =>
    !file.links.some(link => link.entry_id === entryId && link.entry_type === entryType) &&
    !stagedIds.includes(file.id),
  )

  function linkedTo(file: OwnedFile) {
    if (file.links.length === 0) return 'Not attached to anything yet'
    const titles = file.links.map(link => link.title ?? (link.entry_type === 'case' ? 'a case in Trash' : 'an entry in Trash'))
    const shown = titles.slice(0, 2).map(title => `"${title}"`).join(', ')
    return `Attached to ${shown}${titles.length > 2 ? ` and ${titles.length - 2} more` : ''}`
  }

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={openPicker}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-accent/40 hover:text-[var(--text-primary)]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
          Attach an existing file
        </button>
      ) : (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-canvas)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-emphasis)]">
              Reuse a file you already uploaded
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close file picker"
              className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {loading ? (
            <p className="py-3 text-center text-xs text-[var(--text-muted)]">Loading your files…</p>
          ) : available.length === 0 ? (
            <p className="py-3 text-center text-xs text-[var(--text-muted)]">
              {files && files.length > 0
                ? 'All your uploaded files are already attached here.'
                : 'You have no other uploaded files to reuse yet.'}
            </p>
          ) : (
            <ul className="max-h-64 space-y-1.5 overflow-y-auto">
              {available.map(file => (
                <li
                  key={file.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay-faint)] px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-[var(--text-primary)]">{file.file_name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {formatFileSize(file.file_size)} · {linkedTo(file)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onStage({ id: file.id, file_name: file.file_name, file_size: file.file_size })}
                    className="shrink-0 rounded-lg border border-accent/40 px-2.5 py-1.5 text-xs font-medium text-[var(--accent-text)] transition-colors hover:bg-accent/10"
                  >
                    Attach
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Attached files are added when you save changes. Reusing a file doesn&apos;t upload it again or use extra storage.
          </p>
        </div>
      )}
    </div>
  )
}
