'use client'

import { useRef, useState } from 'react'
import BottomSheet from '@/components/ui/bottom-sheet'

const THRESHOLD = 80
const MAX_OFFSET = 120

type SwipeToDeleteProps = {
  children: React.ReactNode
  title?: string
  description?: string
  confirmLabel?: string
  disabled?: boolean
  className?: string
  onConfirm: () => Promise<void> | void
}

export default function SwipeToDelete({
  children,
  title = 'Move to trash?',
  description,
  confirmLabel = 'Move to trash',
  disabled = false,
  className = '',
  onConfirm,
}: SwipeToDeleteProps) {
  const [offset, setOffset] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const startRef = useRef({ x: 0, y: 0 })
  const draggingRef = useRef(false)
  const blockClickRef = useRef(false)

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled || event.pointerType === 'mouse') return
    startRef.current = { x: event.clientX, y: event.clientY }
    draggingRef.current = false
    blockClickRef.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled || event.pointerType === 'mouse') return
    const dx = event.clientX - startRef.current.x
    const dy = event.clientY - startRef.current.y
    if (dx < -8 && Math.abs(dx) > Math.abs(dy)) draggingRef.current = true
    if (!draggingRef.current) return
    event.preventDefault()
    blockClickRef.current = true
    setOffset(Math.max(-MAX_OFFSET, Math.min(0, dx)))
  }

  function onPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled || event.pointerType === 'mouse') return
    if (draggingRef.current && Math.abs(offset) >= THRESHOLD) {
      setOffset(-96)
      setConfirmOpen(true)
    } else {
      setOffset(0)
    }
    draggingRef.current = false
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // The browser may release capture automatically after cancellation.
    }
  }

  async function confirmDelete() {
    setBusy(true)
    await onConfirm()
    setBusy(false)
    setConfirmOpen(false)
    setOffset(0)
  }

  function closeSheet() {
    if (busy) return
    setConfirmOpen(false)
    setOffset(0)
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        className="absolute inset-y-0 right-0 flex w-28 items-center justify-center bg-red-500/15 text-xs font-semibold text-red-100 transition-opacity"
        style={{ opacity: disabled ? 0 : Math.min(1, Math.abs(offset) / THRESHOLD) }}
      >
        Delete
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={event => {
          if (!blockClickRef.current) return
          event.preventDefault()
          event.stopPropagation()
          blockClickRef.current = false
        }}
        className="relative"
        style={{
          touchAction: disabled ? undefined : 'pan-y',
          transform: `translateX(${offset}px)`,
          transition: draggingRef.current ? 'none' : 'transform 160ms ease',
        }}
      >
        {children}
      </div>
      <BottomSheet
        open={confirmOpen}
        onClose={closeSheet}
        title={title}
        description={description}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={closeSheet}
              disabled={busy}
              className="min-h-[44px] flex-1 rounded-xl border border-white/[0.08] text-sm font-medium text-[rgba(245,245,242,0.65)] transition-colors hover:text-[#F5F5F2] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={busy}
              className="min-h-[44px] flex-[1.4] rounded-xl bg-red-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            >
              {busy ? 'Deleting...' : confirmLabel}
            </button>
          </div>
        }
      />
    </div>
  )
}
