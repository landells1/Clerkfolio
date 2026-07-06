'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api-fetch'
import { useToast } from '@/components/ui/toast-provider'

type LibraryFile = {
  id: string
  file_name: string
  file_size: number
  mime_type: string | null
  created_at: string | null
  linkCount: number
  attachedHere: boolean
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * "Attach existing file" picker (evidence reuse). Lists the user's already
 * uploaded files with their size and how many entries each is linked to;
 * attaching one creates a link on the server (no re-upload, no extra quota).
 * Refreshes the route so the server-rendered evidence list picks up the new
 * attachment. Rendered only in edit mode (needs a saved entry to link to).
 */
export default function AttachExistingEvidence({
  entryId,
  entryType,
}: {
  entryId: string
  entryType: 'portfolio' | 'case'
}) {
  const router = useRouter()
  const { addToast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<LibraryFile[] | null>(null)
  const [attaching, setAttaching] = useState<string | null>(null)

  async function openPicker() {
    setOpen(true)
    if (files) return
    setLoading(true)
    const params = new URLSearchParams({ entryId, entryType })
    const res = await apiFetch<{ files: LibraryFile[] }>(`/api/evidence/library?${params.toString()}`)
    setLoading(false)
    if (res.ok && res.data?.files) {
      setFiles(res.data.files)
    } else {
      addToast('Could not load your files. Please try again.', 'error')
      setOpen(false)
    }
  }

  async function attach(file: LibraryFile) {
    setAttaching(file.id)
    const res = await apiFetch<{ id: string }>('/api/evidence/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: file.id, entryId, entryType }),
    })
    setAttaching(null)
    if (res.ok) {
      addToast('File attached to this entry.', 'success')
      // Reflect it locally so the picker shows it as attached, then refresh the
      // server-rendered evidence list.
      setFiles(prev => prev?.map(f => f.id === file.id ? { ...f, attachedHere: true, linkCount: f.linkCount + 1 } : f) ?? null)
      router.refresh()
    } else if (res.status === 409) {
      addToast('That file is already attached to this entry.', 'error')
      setFiles(prev => prev?.map(f => f.id === file.id ? { ...f, attachedHere: true } : f) ?? null)
    } else {
      addToast('Could not attach that file. Please try again.', 'error')
    }
  }

  const available = (files ?? []).filter(f => !f.attachedHere)

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={openPicker}
          className="inline-flex items-center gap-2 rounded-lg border border-white/[0.1] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-accent/40 hover:text-[var(--text-primary)]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
          Attach an existing file
        </button>
      ) : (
        <div className="rounded-xl border border-white/[0.08] bg-[var(--bg-canvas)] p-3">
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
                ? 'All your uploaded files are already attached to this entry.'
                : 'You have no other uploaded files to reuse yet.'}
            </p>
          ) : (
            <ul className="max-h-64 space-y-1.5 overflow-y-auto">
              {available.map(file => (
                <li
                  key={file.id}
                  className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-[var(--text-primary)]">{file.file_name}</p>
                    <p className="font-mono text-[10px] text-[var(--text-secondary)]">
                      {formatBytes(file.file_size)}
                      {file.linkCount > 0 && ` · attached to ${file.linkCount} ${file.linkCount === 1 ? 'entry' : 'entries'}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => attach(file)}
                    disabled={attaching === file.id}
                    className="shrink-0 rounded-lg border border-accent/40 px-2.5 py-1.5 text-[11px] font-medium text-[var(--accent-text)] transition-colors hover:bg-accent/10 disabled:opacity-50"
                  >
                    {attaching === file.id ? 'Attaching…' : 'Attach'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[10px] text-[var(--text-muted)]">
            Reusing a file doesn&apos;t upload it again or use extra storage. It counts once no matter how many entries use it.
          </p>
        </div>
      )}
    </div>
  )
}
