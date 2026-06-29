'use client'

import { useEffect, useRef, useState } from 'react'

export type LightboxImage = {
  src: string
  alt: string
  name?: string
}

type ImageLightboxProps = {
  images: LightboxImage[]
  initialIndex: number
  onClose: () => void
}

export default function ImageLightbox({ images, initialIndex, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex)
  const touchStartRef = useRef<number | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const current = images[index]

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
      if (event.key === 'ArrowLeft') setIndex(prev => (prev - 1 + images.length) % images.length)
      if (event.key === 'ArrowRight') setIndex(prev => (prev + 1) % images.length)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [images.length])

  if (!current) return null

  function move(delta: number) {
    setIndex(prev => (prev + delta + images.length) % images.length)
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Evidence image preview"
      onClick={onClose}
      onTouchStart={event => { touchStartRef.current = event.touches[0]?.clientX ?? null }}
      onTouchEnd={event => {
        if (touchStartRef.current === null) return
        const end = event.changedTouches[0]?.clientX ?? touchStartRef.current
        const delta = end - touchStartRef.current
        if (Math.abs(delta) > 40) move(delta > 0 ? -1 : 1)
        touchStartRef.current = null
      }}
    >
      <button
        type="button"
        onClick={event => { event.stopPropagation(); onClose() }}
        className="absolute right-4 top-4 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/[0.14] bg-[var(--bg-surface)] text-[var(--text-primary)]"
        aria-label="Close image preview"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={event => { event.stopPropagation(); move(-1) }}
            className="absolute left-3 top-1/2 hidden min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.14] bg-[var(--bg-surface)] text-[var(--text-primary)] sm:flex"
            aria-label="Previous image"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={event => { event.stopPropagation(); move(1) }}
            className="absolute right-3 top-1/2 hidden min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.14] bg-[var(--bg-surface)] text-[var(--text-primary)] sm:flex"
            aria-label="Next image"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      <figure className="flex max-h-full max-w-5xl flex-col items-center gap-3" onClick={event => event.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.src} alt={current.alt} className="max-h-[82vh] max-w-full rounded-lg object-contain shadow-2xl" />
        <figcaption className="text-center text-xs text-[var(--text-secondary)]">
          {current.name ?? current.alt}
          {images.length > 1 && <span className="ml-2 font-mono">{index + 1}/{images.length}</span>}
        </figcaption>
      </figure>
    </div>
  )
}
