'use client'

import Link from 'next/link'
import { useState } from 'react'
import { MARKETING_EVENTS } from '@/lib/marketing/analytics-events'
import { trackMarketingEvent } from '@/lib/marketing/analytics'
import { Logo } from '../logo'
import { ClockIcon, MenuIcon } from './icons'

const links = [
  ['Product', '/features'],
  ['How it works', '/#how'],
  ["Who it's for", '/#audience'],
  ['Pricing', '/pricing'],
  ['Guides', '/guides'],
  ['About', '/about'],
] as const

export function ProductNav() {
  const [open, setOpen] = useState(false)

  function trackNavigation(label: string, destination: string) {
    trackMarketingEvent(MARKETING_EVENTS.navigation, { label, destination })
  }

  return (
    <nav aria-label="Primary" className="sticky top-0 z-50 border-b border-[var(--p-line)] bg-[var(--p-ground)]">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 rounded-md" onClick={() => trackNavigation('Clerkfolio', '/')}>
          <Logo />
          <span className="text-[17px] font-semibold tracking-[-0.02em]">Clerkfolio</span>
        </Link>
        <div className="hidden items-center gap-7 text-[14.5px] text-[var(--p-ink-2)] lg:flex">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="whitespace-nowrap rounded-md transition-colors hover:text-[var(--p-ink)]" onClick={() => trackNavigation(label, href)}>
              {label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <p className="hidden items-center gap-1.5 whitespace-nowrap text-[13.5px] text-[var(--p-ink-3)] xl:flex">
            <ClockIcon className="h-4 w-4" />
            Sign-ups opening soon
          </p>
          <Link
            href="/login"
            className="flex min-h-10 items-center rounded-full border border-[var(--p-line-strong)] px-4 text-[14px] font-medium transition-colors hover:border-[var(--p-ink-3)]"
            onClick={() => trackMarketingEvent(MARKETING_EVENTS.login, { location: 'header' })}
          >
            Log in
          </Link>
          <button
            type="button"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full lg:hidden"
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
        <div id="landing-nav-menu" className="border-t border-[var(--p-line)] bg-[var(--p-ground)] px-5 pb-5 pt-2 sm:px-8 lg:hidden">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-12 items-center border-b border-[var(--p-line)] text-[16px]"
              onClick={() => {
                trackNavigation(label, href)
                setOpen(false)
              }}
            >
              {label}
            </Link>
          ))}
          <p className="mt-4 flex items-center gap-2 text-[14.5px] text-[var(--p-ink-3)]">
            <ClockIcon className="h-4 w-4" />
            Public sign-ups opening soon
          </p>
        </div>
      ) : null}
    </nav>
  )
}
