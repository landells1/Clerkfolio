'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useEffect } from 'react'

type PullToRefreshProps = {
  children: React.ReactNode
  className?: string
  threshold?: number
}

export default function PullToRefresh({ children, className = '', threshold = 60 }: PullToRefreshProps) {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const startYRef = useRef(0)
  const activeRef = useRef(false)
  const refreshTimerRef = useRef<number | null>(null)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current)
    }
  }, [])

  function scroller() {
    return rootRef.current?.closest('main') ?? document.scrollingElement
  }

  function isAtTop() {
    return (scroller()?.scrollTop ?? 0) <= 0
  }

  function onTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (!isAtTop()) return
    activeRef.current = true
    startYRef.current = event.touches[0]?.clientY ?? 0
  }

  function onTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (!activeRef.current || !isAtTop()) return
    const y = event.touches[0]?.clientY ?? 0
    const delta = y - startYRef.current
    if (delta <= 0) return
    event.preventDefault()
    setPull(Math.min(96, delta * 0.55))
  }

  function onTouchEnd() {
    if (!activeRef.current) return
    activeRef.current = false
    if (pull >= threshold) {
      setRefreshing(true)
      setPull(threshold)
      router.refresh()
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = window.setTimeout(() => {
        setRefreshing(false)
        setPull(0)
      }, 700)
    } else {
      setPull(0)
    }
  }

  const visible = pull > 0 || refreshing

  return (
    <div
      ref={rootRef}
      className={className}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      style={{ transform: visible ? `translateY(${Math.min(pull, threshold)}px)` : undefined, transition: activeRef.current ? 'none' : 'transform 180ms ease' }}
    >
      <div
        aria-hidden={!visible}
        className="pointer-events-none fixed left-1/2 top-16 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/[0.08] bg-[var(--bg-surface)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] shadow-2xl transition-opacity lg:top-4"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <span className="h-3.5 w-3.5 rounded-full border-2 border-accent/30 border-t-[var(--accent)] motion-safe:animate-spin" />
        {refreshing ? 'Refreshing' : 'Release to refresh'}
      </div>
      {children}
    </div>
  )
}
