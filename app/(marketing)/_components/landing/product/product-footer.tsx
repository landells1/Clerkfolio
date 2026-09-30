import Link from 'next/link'
import CookiePreferencesButton from '@/components/legal/cookie-preferences-button'
import { MARKETING_EVENTS } from '@/lib/marketing/analytics-events'
import { Logo } from './mocks'
import { TrackedLink } from '../tracked-link'
import { ArrowIcon, ClockIcon } from './icons'
import { CONTAINER } from './shared'
import styles from './product.module.css'

const footerGroups = [
  ['Product', [['Product', '/features'], ['Pricing', '/pricing'], ['Guides', '/guides'], ['Help', '/faq']]],
  ['Company', [['About', '/about'], ['Contact', '/contact'], ['Log in', '/login']]],
  ['Legal', [['Privacy', '/privacy'], ['Terms', '/terms'], ['Cookies', '/cookies'], ['Security', '/security'], ['Subprocessors', '/subprocessors']]],
] as const

const LINK = 'flex min-h-11 items-center text-[14.5px] text-[var(--p-ink-2)] transition-colors hover:text-[var(--p-ink)]'

export function ProductFooter() {
  return (
    <footer>
      <div className="relative overflow-hidden py-28 sm:py-36">
        <div className={`${styles.fieldNavy} absolute inset-0`} aria-hidden="true" />
        <div className={`${styles.wedge} absolute bottom-0 right-0 hidden h-[45%] w-[26%] lg:block`} aria-hidden="true" />
        <div className={`${CONTAINER} relative text-center text-[var(--p-on-field)]`}>
          <h2 className={`${styles.display} mx-auto max-w-[16ch] text-[clamp(2.4rem,5.2vw,4.4rem)]`}>
            Keep your evidence ready for what comes next.
          </h2>
          <p className={`${styles.prose} mx-auto mt-6 max-w-[32rem] text-[18px] leading-[1.6] text-[var(--p-on-field)]`}>
            While sign-ups open, explore the product or read the practical guides.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-7">
            <TrackedLink
              href="/features"
              analyticsEvent={MARKETING_EVENTS.cta}
              analyticsProperties={{ location: 'footer', action: 'explore_product' }}
              className="inline-flex min-h-12 items-center gap-2 whitespace-nowrap rounded-full bg-[var(--p-on-field)] px-6 text-[15.5px] font-semibold text-[var(--p-navy)] no-underline shadow-[0_10px_24px_-10px_rgb(10_26_47/0.5)] transition-transform hover:-translate-y-px"
            >
              Explore the product
              <ArrowIcon className="h-[18px] w-[18px]" />
            </TrackedLink>
            <p className="flex items-center gap-2 text-[15px] text-[var(--p-on-field)]">
              <ClockIcon className="h-[18px] w-[18px]" />
              Public sign-ups opening soon
            </p>
          </div>
        </div>
      </div>
      <div className={`${CONTAINER} py-14`}>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <p className="flex items-center gap-2.5 text-[16px] font-semibold"><Logo /> Clerkfolio</p>
            <p className="mt-3 max-w-[16rem] text-[14px] leading-[1.55] text-[var(--p-ink-3)]">One medical portfolio for your whole career.</p>
          </div>
          {footerGroups.map(([heading, links]) => (
            <div key={heading}>
              <p className="text-[13.5px] font-semibold">{heading}</p>
              <ul className="mt-2">
                {links.map(([label, href]) => (
                  <li key={href}><Link href={href} className={LINK}>{label}</Link></li>
                ))}
                {heading === 'Legal' ? <li><CookiePreferencesButton className={`${LINK} text-left`} /></li> : null}
              </ul>
            </div>
          ))}
        </nav>
        <p className="mt-12 border-t border-[var(--p-line)] pt-8 text-[13.5px] text-[var(--p-ink-3)]">
          Clerkfolio 2026. Independent, and not affiliated with the NHS, GMC or any Royal College.
        </p>
      </div>
    </footer>
  )
}
