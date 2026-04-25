'use client'

import { useEffect, useRef, useState } from 'react'

/** Renders a live image thumbnail for a local File object, cleaning up the object URL on unmount. */
function ImagePreview({ file }: { file: File }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  if (!src) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0 border border-white/[0.08]" />
  )
}

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.doc,.docx'
const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50 MB

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

  function handleFiles(incoming: FileList | null) {
    if (!incoming) return
    const valid: File[] = []
    const errs: string[] = []
    for (const f of Array.from(incoming)) {
      if (f.size > MAX_FILE_BYTES) {
        errs.push(`"${f.name}" is too large (max 50 MB per file).`)
        continue
      }
      if (!files.some(existing => existing.name === f.name && existing.size === f.size)) {
        valid.push(f)
      }
    }
    if (errs.length > 0) setUploadErrors(errs)
    onChange([...files, ...valid])
  }

  function remove(index: number) {
    onChange(files.filter((_, i) => i !== index))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (disabled) return
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-3">
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
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-6 px-4 transition-colors text-center ${
          disabled
            ? 'border-white/[0.05] cursor-not-allowed opacity-50'
            : 'border-white/[0.1] hover:border-[#1B6FD9]/50 hover:bg-[#1B6FD9]/5 cursor-pointer'
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p className="text-xs text-[rgba(245,245,242,0.4)]">
          Click or drag files here
        </p>
        <p className="text-[10px] text-[rgba(245,245,242,0.25)]">
          PDF, JPG, PNG, DOC, DOCX — max 50 MB per file
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
                : <span className="shrink-0 text-[rgba(245,245,242,0.4)]">{fileIcon(f.type)}</span>
              }
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[rgba(245,245,242,0.8)] truncate">{f.name}</p>
                <p className="text-[10px] text-[rgba(245,245,242,0.3)] font-mono">{formatBytes(f.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="shrink-0 text-[rgba(245,245,242,0.3)] hover:text-red-400 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
