import Link from 'next/link'
import { Logo } from './logo'
import CookiePreferencesButton from '@/components/legal/cookie-preferences-button'

export function CtaFooter() {
  return (
    <footer className="border-t border-default px-6 py-14 sm:py-20 md:px-14 lg:py-28">
      <div className="mx-auto max-w-4xl text-center">
        <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">◉ Begin</p>
        <h2 className="text-[clamp(34px,9vw,56px)] font-medium leading-none tracking-[-0.055em] lg:text-[clamp(56px,7vw,96px)]">
          Start building<br />
          <span className="bg-[image:var(--accent-gradient)] bg-clip-text font-normal italic text-transparent">
            your portfolio.
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-[1.55] text-ink-soft sm:mt-8 sm:text-lg">
          Free forever - no credit card needed for the free tier.
        </p>
        <div className="mt-8 flex flex-col items-center gap-2 sm:mt-10">
          <span aria-disabled="true" className="inline-flex cursor-default select-none justify-center rounded-lg bg-accent/70 px-8 py-4 text-sm font-semibold text-white">
            Coming soon
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-dim">Public sign-ups opening soon</span>
        </div>
      </div>
      <div className="mt-14 flex flex-col gap-6 border-t border-default pt-7 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-dim sm:mt-24 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5"><Logo /><span>Clerkfolio · 2026</span></div>
        <div className="flex flex-wrap gap-5">
          <Link href="/features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/guides">Guides</Link>
          <Link href="/about">About</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/security">Security</Link>
          <Link href="/subprocessors">Subprocessors</Link>
          <Link href="/contact">Contact</Link>
          <CookiePreferencesButton className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-dim transition-colors hover:text-ink" />
        </div>
      </div>
    </footer>
  )
}
