import Link from 'next/link'
import CookiePreferencesButton from '@/components/legal/cookie-preferences-button'
import { MARKETING_EVENTS } from '@/lib/marketing/analytics-events'
import { Logo } from './logo'
import { TrackedLink } from './tracked-link'

const footerLinks = [
  ['Product', '/features'],
  ['Pricing', '/pricing'],
  ['Guides', '/guides'],
  ['About', '/about'],
  ['Help', '/faq'],
  ['Contact', '/contact'],
  ['Privacy', '/privacy'],
  ['Terms', '/terms'],
  ['Cookies', '/cookies'],
  ['Security', '/security'],
  ['Subprocessors', '/subprocessors'],
] as const

export function CtaFooter() {
  return (
    <footer className="border-t border-default px-6 py-14 sm:py-20 md:px-14 lg:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">Next stage</p>
        <h2 className="text-[clamp(34px,9vw,56px)] font-medium leading-none tracking-[-0.055em] lg:text-[clamp(56px,6vw,82px)]">
          Keep your evidence ready<br />
          <span className="bg-[image:var(--accent-gradient)] bg-clip-text font-normal italic text-transparent">
            for what comes next.
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-[1.55] text-ink-soft sm:mt-7 sm:text-lg">
          Clerkfolio public sign-ups are opening soon. In the meantime, explore the product or read the practical guides.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <p className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-accent/30 bg-[var(--accent-soft)] px-6 py-3 text-sm font-medium text-[var(--accent-soft-text)]">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
            Public sign-ups opening soon
          </p>
          <TrackedLink
            href="/features"
            analyticsEvent={MARKETING_EVENTS.cta}
            analyticsProperties={{ location: 'footer', action: 'explore_product' }}
            className="inline-flex min-h-12 items-center rounded-lg border border-strong px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-accent/50 hover:text-accent"
          >
            Explore the product
          </TrackedLink>
        </div>
      </div>
      <div className="mt-14 flex flex-col gap-6 border-t border-default pt-7 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-dim sm:mt-20 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2.5"><Logo /><span>Clerkfolio · 2026</span></div>
        <div className="flex max-w-4xl flex-wrap gap-x-5 gap-y-3">
          {footerLinks.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
          <Link href="/login">Log in</Link>
          <CookiePreferencesButton className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-dim transition-colors hover:text-ink" />
        </div>
      </div>
    </footer>
  )
}
