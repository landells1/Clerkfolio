import Link from 'next/link'
import CookiePreferencesButton from '@/components/legal/cookie-preferences-button'
import { MARKETING_EVENTS } from '@/lib/marketing/analytics-events'
import { TrackedLink } from '../tracked-link'
import { ArrowIcon, RotaLogo } from './icons'
import { OpeningStatus } from './rota-sections'
import styles from './rota.module.css'

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
  ['Log in', '/login'],
] as const

const linkCell = 'flex min-h-12 items-center border-b border-r border-[var(--r-grid)] px-4 text-[14px] text-[var(--r-ink-2)] transition-colors hover:bg-[var(--r-header)] hover:text-[var(--r-ink)] sm:px-6'

export function RotaFooter() {
  return (
    <footer className="border-t-2 border-[var(--r-ink)]">
      <div className="px-4 pb-14 pt-20 sm:px-6 sm:pt-24 lg:px-10 lg:pb-20 lg:pt-32">
        <h2 className={`${styles.display} max-w-[16ch] text-[clamp(3rem,8vw,6rem)]`}>
          Keep your evidence ready for what comes next.
        </h2>
        <p className={`${styles.prose} mt-6 max-w-[56ch] text-[17px] leading-[1.6] text-[var(--r-ink-2)] sm:text-[19px]`}>
          Clerkfolio public sign-ups are opening soon. In the meantime, explore the product or read the practical guides.
        </p>
        <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-7">
          <OpeningStatus />
          <TrackedLink
            href="/features"
            analyticsEvent={MARKETING_EVENTS.cta}
            analyticsProperties={{ location: 'footer', action: 'explore_product' }}
            className="inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-[var(--r-ink)] underline decoration-[var(--r-grid-strong)] hover:text-[var(--r-select)] hover:decoration-[var(--r-select)]"
          >
            Explore the product
            <ArrowIcon />
          </TrackedLink>
        </div>
      </div>
      <nav aria-label="Footer" className="grid grid-cols-2 border-t border-[var(--r-grid)] sm:grid-cols-4 lg:grid-cols-6">
        {footerLinks.map(([label, href]) => (
          <Link key={href} href={href} className={linkCell}>{label}</Link>
        ))}
        <CookiePreferencesButton className={`${linkCell} text-left`} />
      </nav>
      <p className="flex min-h-12 items-center gap-3 bg-[var(--r-header)] px-4 text-[13px] text-[var(--r-ink-3)] sm:px-6">
        <RotaLogo />
        Clerkfolio 2026. Independent, and not affiliated with the NHS, GMC or any Royal College.
      </p>
    </footer>
  )
}
