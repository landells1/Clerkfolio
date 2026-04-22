'use client'

import { useState } from 'react'
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

  async function handleDownload(file: EvidenceFile) {
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
    if (!confirm(`Delete "${file.file_name}"? This cannot be undone.`)) return
    setDeleting(file.id)
    await deleteEvidenceFile(file.id, file.file_path)
    setFiles(prev => prev.filter(f => f.id !== file.id))
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
          <li
            key={file.id}
            className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3.5 py-2.5"
          >
            <svg className="shrink-0 text-[rgba(245,245,242,0.35)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[rgba(245,245,242,0.8)] truncate">{file.file_name}</p>
              <p className="text-[10px] text-[rgba(245,245,242,0.3)] font-mono">{formatBytes(file.file_size)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleDownload(file)}
                disabled={downloading === file.id}
                className="text-xs text-[#1D9E75] hover:text-[#22c693] transition-colors disabled:opacity-50"
              >
                {downloading === file.id ? 'Getting link…' : 'Download'}
              </button>
              {canDelete && (
                <button
                  onClick={() => handleDelete(file)}
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
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
