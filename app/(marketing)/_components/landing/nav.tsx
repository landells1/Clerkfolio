'use client'

import Link from 'next/link'
import { useState } from 'react'
import { MARKETING_EVENTS } from '@/lib/marketing/analytics-events'
import { trackMarketingEvent } from '@/lib/marketing/analytics'
import { Logo } from './logo'

// Homepage-absolute hrefs keep section links working from every public page.
const links = [
  ['Product', '/features'],
  ['How it works', '/#how'],
  ["Who it's for", '/#audience'],
  ['Pricing', '/pricing'],
  ['Guides', '/guides'],
  ['About', '/about'],
] as const

export function Nav() {
  const [open, setOpen] = useState(false)

  function trackNavigation(label: string, destination: string) {
    trackMarketingEvent(MARKETING_EVENTS.navigation, { label, destination })
  }

  return (
    <nav aria-label="Primary" className="sticky top-0 z-50 border-b border-default bg-[var(--bg-canvas)]/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-5 md:px-14">
        <div className="flex items-center gap-8 lg:gap-11">
          <Link href="/" className="flex items-center gap-2.5 rounded-sm" onClick={() => trackNavigation('Clerkfolio', '/')}>
            <Logo />
            <span className="text-base font-medium tracking-[-0.02em] text-ink">Clerkfolio</span>
          </Link>
          <div className="hidden items-center gap-6 text-[13px] text-ink-soft lg:flex">
            {links.map(([label, href]) => (
              <Link key={href} href={href} className="rounded-sm transition hover:text-ink" onClick={() => trackNavigation(label, href)}>
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/login"
            className="rounded-sm px-2 py-2.5 text-[13px] text-ink-soft hover:text-ink"
            onClick={() => trackMarketingEvent(MARKETING_EVENTS.login, { location: 'header' })}
          >
            Log in
          </Link>
          <span className="hidden rounded-lg border border-accent/25 bg-[var(--accent-soft)] px-3 py-2 text-[12px] font-medium text-[var(--accent-soft-text)] sm:inline-flex">
            Sign-ups opening soon
          </span>
          <button
            type="button"
            className="-mr-1.5 flex h-11 w-11 items-center justify-center rounded-md text-ink-soft transition hover:text-ink lg:hidden"
            aria-expanded={open}
            aria-controls="landing-nav-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              {open ? (
                <><path d="M4 4l12 12" /><path d="M16 4L4 16" /></>
              ) : (
                <><path d="M3 5.5h14" /><path d="M3 10h14" /><path d="M3 14.5h14" /></>
              )}
            </svg>
          </button>
        </div>
      </div>
      {open ? (
        <div id="landing-nav-menu" className="border-t border-subtle bg-[var(--bg-canvas)] px-4 pb-4 pt-2 sm:px-6 lg:hidden">
          <div className="flex flex-col">
            {links.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-md px-2 py-3 text-[15px] text-ink-soft transition hover:text-ink"
                onClick={() => {
                  trackNavigation(label, href)
                  setOpen(false)
                }}
              >
                {label}
              </Link>
            ))}
            <p className="mt-2 rounded-lg border border-accent/25 bg-[var(--accent-soft)] px-3 py-3 text-sm text-[var(--accent-soft-text)] sm:hidden">
              Public sign-ups opening soon
            </p>
          </div>
        </div>
      ) : null}
    </nav>
  )
}
