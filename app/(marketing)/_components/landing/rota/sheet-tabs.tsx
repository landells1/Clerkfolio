'use client'

import { useEffect, useState } from 'react'
import styles from './rota.module.css'

export const SHEETS = [
  ['top', 'Career'],
  ['why', 'Why'],
  ['how', 'How'],
  ['features', 'Features'],
  ['privacy-and-control', 'Your data'],
  ['audience', 'Audience'],
  ['pricing', 'Pricing'],
  ['faq', 'FAQ'],
] as const

// Sheet tabs along the bottom edge, as in a workbook: the page's wayfinding.
export function SheetTabs() {
  const [active, setActive] = useState<string>(SHEETS[0][0])

  useEffect(() => {
    const sections = SHEETS.map(([id]) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null)
    const observer = new IntersectionObserver(
      observed => {
        const visible = observed.filter(entry => entry.isIntersecting)
        if (visible.length > 0) setActive(visible[visible.length - 1].target.id)
      },
      { rootMargin: '-35% 0px -60% 0px' },
    )
    sections.forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  return (
    <nav aria-label="Page sections" className="sticky bottom-0 z-40 border-t border-[var(--r-grid-strong)] bg-[var(--r-header)]">
      <div className={`${styles.scrollStrip} flex overflow-x-auto`}>
        {SHEETS.map(([id, label]) => {
          const isActive = id === active
          return (
            <a
              key={id}
              href={`#${id}`}
              aria-current={isActive ? 'location' : undefined}
              className={`flex min-h-11 flex-shrink-0 items-center border-r border-[var(--r-grid)] px-4 text-[14px] no-underline transition-colors sm:px-5 ${
                isActive
                  ? 'bg-[var(--r-ground)] font-semibold text-[var(--r-select)] shadow-[inset_0_-3px_0_var(--r-select)]'
                  : 'text-[var(--r-ink-2)] hover:bg-[var(--r-ground)] hover:text-[var(--r-ink)]'
              }`}
            >
              {label}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
