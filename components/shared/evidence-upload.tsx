'use client'

import { useEffect, useRef, useState } from 'react'
import { isAllowedEvidenceFile, MAX_FILE_BYTES } from '@/lib/supabase/storage'
import { mergeUniqueFiles } from '@/lib/upload/dedupe-files'
import { apiFetch } from '@/lib/api-fetch'
import StorageMeter from '@/components/upgrade/storage-meter'

/** A 36px placeholder/fallback box showing the generic image icon, used while a
 *  thumbnail loads or if the object-URL preview fails to paint (REG-001: an
 *  image whose blob preview did not render left a blank gap in the list). */
function ImageIconBox() {
  return (
    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded border border-white/[0.08] bg-white/[0.03] text-[var(--text-muted)]">
      <ImgIcon />
    </span>
  )
}

/** Renders a live image thumbnail for a local File object, cleaning up the object URL on unmount. */
function ImagePreview({ file }: { file: File }) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    setFailed(false)
    return () => URL.revokeObjectURL(url)
  }, [file])
  // Never collapse to nothing: show the icon box until the thumbnail is ready,
  // and fall back to it permanently if the preview cannot be decoded/displayed.
  if (!src || failed) return <ImageIconBox />
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="File preview"
      onError={() => setFailed(true)}
      className="w-9 h-9 rounded object-cover flex-shrink-0 border border-white/[0.08]"
    />
  )
}

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.pptx,.txt,.heic,.heif'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(mime: string | undefined) {
  if (!mime) return <DocIcon />
  if (mime === 'application/pdf') return <PdfIcon />
  if (mime.startsWith('image/')) return <ImgIcon />
  return <DocIcon />
}

export default function EvidenceUpload({
  files,
  onChange,
  disabled = false,
}: {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  // F-040: show the storage used/quota meter near the dropzone so the cap is
  // never a surprise. Best-effort: fetched once on mount; silently hidden if
  // unavailable. apiFetch never throws (status === null on network failure).
  const [storage, setStorage] = useState<{ usedMB: number; quotaMB: number } | null>(null)
  useEffect(() => {
    let active = true
    apiFetch<{ usedMB: number; quotaMB: number }>('/api/account/storage').then(res => {
      if (active && res.status === 200 && res.data && typeof res.data.quotaMB === 'number') {
        setStorage({ usedMB: res.data.usedMB ?? 0, quotaMB: res.data.quotaMB })
      }
    })
    return () => { active = false }
  }, [])

  function handleFiles(incoming: FileList | null) {
    if (!incoming) return
    const valid: File[] = []
    const errs: string[] = []
    for (const f of Array.from(incoming)) {
      if (!isAllowedEvidenceFile(f)) {
        errs.push(`"${f.name}" has an unsupported file type.`)
        continue
      }
      if (f.size > MAX_FILE_BYTES) {
        errs.push(`"${f.name}" is too large (max 50 MB per file).`)
        continue
      }
      valid.push(f)
    }
    setUploadErrors(errs)
    onChange(mergeUniqueFiles(files, valid))
  }

  function remove(index: number) {
    onChange(files.filter((_, i) => i !== index))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    // Stop the drop from also bubbling to the surrounding form, which now only
    // swallows stray drops (it no longer stages files - QOL-011/QOL-014).
    e.stopPropagation()
    setDragOver(false)
    if (disabled) return
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-3">
      {storage && <StorageMeter usedMB={storage.usedMB} quotaMB={storage.quotaMB} />}

      {/* Inline upload errors */}
      {uploadErrors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5 space-y-1">
          {uploadErrors.map((e, i) => (
            <p key={i} className="text-xs text-red-400">{e}</p>
          ))}
          <button
            type="button"
            onClick={() => setUploadErrors([])}
            className="text-[10px] text-red-400/60 hover:text-red-400 underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); if (!disabled) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-6 px-4 transition-colors text-center ${
          disabled
            ? 'border-white/[0.05] cursor-not-allowed opacity-50'
            : dragOver
              ? 'border-[var(--accent)] bg-[#1B6FD9]/10 cursor-copy'
              : 'border-white/[0.1] hover:border-[#1B6FD9]/50 hover:bg-[#1B6FD9]/5 cursor-pointer'
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p className="text-xs text-[var(--text-muted)]">
          Click or drag files here
        </p>
        <p className="text-[10px] text-[var(--text-secondary)]">
          PDF, JPG, PNG, DOC, DOCX, XLSX, PPTX, TXT, HEIC - max 50 MB per file
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
          disabled={disabled}
        />
      </div>

      {/* Selected files */}
      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2">
              {f.type.startsWith('image/')
                ? <ImagePreview file={f} />
                : <span className="shrink-0 text-[var(--text-muted)]">{fileIcon(f.type)}</span>
              }
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-primary)] truncate">{f.name}</p>
                <p className="text-[10px] text-[var(--text-secondary)] font-mono">{formatBytes(f.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${f.name}`}
                className="shrink-0 text-[var(--text-secondary)] hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PdfIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function ImgIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function DocIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  )
}
