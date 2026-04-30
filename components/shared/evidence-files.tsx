'use client'

import { useEffect, useState } from 'react'
import { getSignedUrl, deleteEvidenceFile, type EvidenceFile } from '@/lib/supabase/storage'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function EvidenceFiles({
  initialFiles,
  canDelete = false,
}: {
  initialFiles: EvidenceFile[]
  canDelete?: boolean
}) {
  const [files, setFiles] = useState<EvidenceFile[]>(initialFiles)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDownload(file: EvidenceFile) {
    if ((file.scan_status ?? 'clean') !== 'clean') return
    setDownloading(file.id)
    const url = await getSignedUrl(file.file_path)
    if (url) {
      const a = document.createElement('a')
      a.href = url
      a.download = file.file_name
      a.click()
    }
    setDownloading(null)
  }

  async function handleDelete(file: EvidenceFile) {
    setDeleting(file.id)
    setConfirmDeleteId(null)
    const { error } = await deleteEvidenceFile(file.id, file.file_path)
    if (!error) {
      setFiles(prev => prev.filter(f => f.id !== file.id))
    }
    setDeleting(null)
  }

  if (files.length === 0) return null

  return (
    <div>
      <p className="text-[10px] font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider mb-3">
        Evidence ({files.length} {files.length === 1 ? 'file' : 'files'})
      </p>
      <ul className="space-y-2">
        {files.map(file => (
          (() => {
            const status = file.scan_status ?? 'clean'
            const blocked = status !== 'clean'
            const statusLabel = status === 'clean'
              ? file.scan_provider === 'clamav' ? ' - virus scanned' : ' - MIME verified'
              : status === 'quarantined' ? ' - quarantined' : ' - scanning'
            return (
          <li
            key={file.id}
            className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3.5 py-2.5"
          >
            {previewUrls[file.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrls[file.id]}
                alt=""
                className="w-9 h-9 rounded object-cover flex-shrink-0 border border-white/[0.08]"
              />
            ) : (
              <svg className="shrink-0 text-[rgba(245,245,242,0.35)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[rgba(245,245,242,0.8)] truncate">{file.file_name}</p>
              <p className="text-[10px] text-[rgba(245,245,242,0.3)] font-mono">
                {formatBytes(file.file_size)}
                {statusLabel}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleDownload(file)}
                disabled={downloading === file.id || blocked}
                className="text-xs text-[#1B6FD9] hover:text-[#3884DD] transition-colors disabled:opacity-50"
              >
                {blocked ? 'Locked' : downloading === file.id ? 'Getting link...' : 'Download'}
              </button>
              {canDelete && (
                confirmDeleteId === file.id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[rgba(245,245,242,0.4)]">Delete?</span>
                    <button
                      onClick={() => handleDelete(file)}
                      disabled={deleting === file.id}
                      className="text-[10px] text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
                    >
                      {deleting === file.id ? '…' : 'Yes'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-[10px] text-[rgba(245,245,242,0.35)] hover:text-[rgba(245,245,242,0.6)]"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(file.id)}
                    disabled={deleting === file.id}
                    className="text-[rgba(245,245,242,0.3)] hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                )
              )}
            </div>
          </li>
            )
          })()
        ))}
      </ul>
    </div>
  )
}
