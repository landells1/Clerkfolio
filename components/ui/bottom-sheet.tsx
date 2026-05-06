'use client'

import { useEffect } from 'react'

type BottomSheetProps = {
  open: boolean
  title: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  onClose: () => void
}

export default function BottomSheet({ open, title, description, children, footer, onClose }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
        className="w-full rounded-t-2xl border border-white/[0.08] bg-[#141416] p-5 shadow-2xl motion-safe:animate-[sheet-in_180ms_ease-out] sm:max-w-md sm:rounded-2xl sm:p-6"
        onClick={event => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/[0.18] sm:hidden" />
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="bottom-sheet-title" className="text-base font-semibold text-[#F5F5F2]">{title}</h2>
            {description && <p className="mt-1 text-sm leading-6 text-[rgba(245,245,242,0.58)]">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[rgba(245,245,242,0.55)] transition-colors hover:bg-white/[0.06] hover:text-[#F5F5F2]"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {children}
        {footer && <div className="mt-5">{footer}</div>}
      </div>
    </div>
  )
}
