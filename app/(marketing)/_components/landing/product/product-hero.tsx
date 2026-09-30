import { MARKETING_EVENTS } from '@/lib/marketing/analytics-events'
import { TrackedLink } from '../tracked-link'
import { ArrowDownIcon, ClockIcon } from './icons'
import { AppWindow, CaseFormPhone, Phone, PortfolioPage, PortfolioPhone } from './mocks'
import styles from './product.module.css'
import { CONTAINER, PRIMARY_BUTTON } from './shared'

export function OpeningStatus({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-center gap-2 text-[15px] text-[var(--p-ink-2)] ${className}`}>
      <ClockIcon className="h-[18px] w-[18px] text-[var(--p-warm)]" />
      Public sign-ups opening soon
    </p>
  )
}

const trust = ['Hosted in London, UK', 'Encrypted in transit and at rest', 'Export your records any time']

export function ProductHero() {
  return (
    <section id="top" aria-labelledby="hero-title" className="relative scroll-mt-20 overflow-hidden">
      <div className={`${CONTAINER} pb-10 pt-10 text-center sm:pb-14 sm:pt-24`}>
        <h1 id="hero-title" className={`${styles.display} mx-auto max-w-[15ch] text-[clamp(2.75rem,6.4vw,5.1rem)]`}>
          One medical portfolio for your whole career.
        </h1>
        <p className={`${styles.prose} mx-auto mt-5 max-w-[36rem] text-[17px] leading-[1.6] text-[var(--p-ink-2)] sm:mt-6 sm:text-[20px]`}>
          Keep your achievements, specialty application evidence and anonymised case logs together. Clerkfolio stays with you when you move trust, hospital or training stage.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-4 sm:mt-9 sm:flex-row sm:gap-7">
          <TrackedLink
            href="#how"
            analyticsEvent={MARKETING_EVENTS.cta}
            analyticsProperties={{ location: 'hero', action: 'see_how_it_works' }}
            className={PRIMARY_BUTTON}
          >
            See how Clerkfolio works
            <ArrowDownIcon className="h-[18px] w-[18px]" />
          </TrackedLink>
          <OpeningStatus />
        </div>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[13px] text-[var(--p-ink-3)] sm:mt-8 sm:gap-x-6 sm:text-[13.5px]">
          {trust.map(item => (
            <li key={item} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--p-warm)]" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="relative pb-20 sm:pb-28">
        <div className={`${styles.field} absolute inset-x-0 bottom-0 top-[22%]`} aria-hidden="true" />
        <div className={`${CONTAINER} relative`}>
          {/* Laptop and phone side by side: the phone sits beside the window,
              never over it, so no part of either screen is hidden. */}
          <div className={`${styles.settle} relative mx-auto max-w-[1080px] xl:flex xl:max-w-none xl:items-end xl:justify-center xl:gap-10`}>
            <div className="flex justify-center md:hidden">
              <Phone label="Example Clerkfolio portfolio page on a phone">
                <PortfolioPhone />
              </Phone>
            </div>
            <AppWindow label="Example Clerkfolio portfolio page with category tiles and entries" path="portfolio" className="hidden md:block xl:max-w-[880px] xl:flex-1">
              <PortfolioPage />
            </AppWindow>
            <div className={`${styles.phone} hidden flex-shrink-0 xl:block xl:translate-y-10`}>
              <Phone label="Example of logging an anonymised case on a phone">
                <CaseFormPhone />
              </Phone>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
