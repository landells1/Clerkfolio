'use client'

import Link from 'next/link'
import { useState } from 'react'
import { MARKETING_EVENTS } from '@/lib/marketing/analytics-events'
import { trackMarketingEvent } from '@/lib/marketing/analytics'
import { ClockIcon, MenuIcon, RotaLogo } from './icons'
import styles from './rota.module.css'

const links = [
  ['Product', '/features'],
  ['How it works', '/#how'],
  ["Who it's for", '/#audience'],
  ['Pricing', '/pricing'],
  ['Guides', '/guides'],
  ['About', '/about'],
] as const

export function RotaNav() {
  const [open, setOpen] = useState(false)

  function trackNavigation(label: string, destination: string) {
    trackMarketingEvent(MARKETING_EVENTS.navigation, { label, destination })
  }

  return (
    <nav aria-label="Primary" className="sticky top-0 z-50 border-b border-[var(--r-grid)] bg-[var(--r-ground)]">
      <div className="flex h-16 items-stretch">
        <Link
          href="/"
          className="flex items-center gap-3 border-r border-[var(--r-grid)] px-4 sm:px-6"
          onClick={() => trackNavigation('Clerkfolio', '/')}
        >
          <RotaLogo />
          <span className={`${styles.display} text-[26px] leading-none tracking-normal`}>Clerkfolio</span>
        </Link>
        <div className="hidden flex-1 items-stretch lg:flex">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="flex items-center whitespace-nowrap border-r border-[var(--r-grid)] px-4 text-[14px] font-medium xl:px-5 text-[var(--r-ink-2)] transition-colors hover:bg-[var(--r-header)] hover:text-[var(--r-ink)]"
              onClick={() => trackNavigation(label, href)}
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-stretch">
          <p className="hidden items-center gap-2 whitespace-nowrap border-l border-[var(--r-grid)] px-5 text-[14px] text-[var(--r-ink-2)] md:flex lg:hidden xl:flex">
            <ClockIcon className="text-[var(--r-select)]" />
            Sign-ups opening soon
          </p>
          <Link
            href="/login"
            className="flex min-w-[88px] items-center justify-center border-l border-[var(--r-grid)] px-5 text-[14px] font-semibold text-[var(--r-ink)] transition-colors hover:bg-[var(--r-header)]"
            onClick={() => trackMarketingEvent(MARKETING_EVENTS.login, { location: 'header' })}
          >
            Log in
          </Link>
          <button
            type="button"
            className="flex w-16 items-center justify-center border-l border-[var(--r-grid)] text-[var(--r-ink)] transition-colors hover:bg-[var(--r-header)] lg:hidden"
            aria-expanded={open}
            aria-controls="landing-nav-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen(value => !value)}
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </div>
      {open ? (
        <div id="landing-nav-menu" className="border-t border-[var(--r-grid)] bg-[var(--r-ground)] lg:hidden">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-12 items-center border-b border-[var(--r-grid)] px-4 text-[16px] font-medium text-[var(--r-ink)] sm:px-6"
              onClick={() => {
                trackNavigation(label, href)
                setOpen(false)
              }}
            >
              {label}
            </Link>
          ))}
          <p className="flex min-h-12 items-center gap-2 bg-[var(--r-select-soft)] px-4 text-[15px] text-[var(--r-ink)] sm:px-6">
            <ClockIcon className="text-[var(--r-select)]" />
            Public sign-ups opening soon
          </p>
        </div>
      ) : null}
    </nav>
  )
}
