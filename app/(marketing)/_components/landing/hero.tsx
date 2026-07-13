import { MARKETING_EVENTS } from '@/lib/marketing/analytics-events'
import { FloatingCaseCard } from './mocks/floating-case-card'
import { FloatingChecklistCard } from './mocks/floating-checklist-card'
import { MockCasesList } from './mocks/mock-cases-list'
import { MonoLabel } from './mono-label'
import { TrackedLink } from './tracked-link'

export function Hero() {
  return (
    <section className="px-6 py-10 sm:py-14 md:px-14 lg:py-20">
      <div className="mb-5 sm:mb-8">
        <MonoLabel className="text-accent">For UK medical students and doctors</MonoLabel>
      </div>
      <div className="grid grid-cols-1 items-center gap-8 sm:gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(520px,1.05fr)] lg:gap-14">
        <div>
          <h1 className="max-w-[760px] text-[clamp(36px,9.5vw,54px)] font-medium leading-[1.02] tracking-[-0.055em] text-ink lg:text-[clamp(54px,5.7vw,80px)]">
            One medical portfolio<br />
            <span className="bg-[image:var(--accent-gradient)] bg-clip-text font-normal italic text-transparent">
              for your whole career.
            </span>
          </h1>
          <p className="mt-5 max-w-[620px] text-base leading-[1.6] text-ink-soft sm:mt-7 sm:text-lg">
            Keep your achievements, specialty application evidence and anonymised case logs together. Clerkfolio stays with you when you move trust, hospital or training stage.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center">
            <p className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-accent/30 bg-[var(--accent-soft)] px-5 py-3 text-sm font-medium text-[var(--accent-soft-text)]">
              <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
              Public sign-ups opening soon
            </p>
            <TrackedLink
              href="#how"
              analyticsEvent={MARKETING_EVENTS.cta}
              analyticsProperties={{ location: 'hero', action: 'see_how_it_works' }}
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-strong px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-accent/50 hover:text-accent"
            >
              See how Clerkfolio works
            </TrackedLink>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-[18px] gap-y-2 font-mono text-[11px] uppercase tracking-[0.05em] text-ink-dim sm:mt-7">
            <span><span aria-hidden>◆</span> UK-hosted · London</span>
            <span><span aria-hidden>◆</span> Encrypted in transit &amp; at rest</span>
            <span><span aria-hidden>◆</span> Export your records</span>
          </div>
        </div>
        <div className="relative max-h-[390px] overflow-hidden rounded-xl sm:max-h-none lg:-mr-8 lg:min-h-[500px] lg:overflow-visible">
          <MockCasesList className="h-[390px] sm:h-auto lg:h-[500px]" />
          <div aria-hidden="true" className="absolute bottom-4 right-2 hidden lg:block"><FloatingCaseCard /></div>
          <div aria-hidden="true" className="pointer-events-none absolute left-0 top-[190px] z-10 hidden lg:block"><FloatingChecklistCard /></div>
        </div>
      </div>
    </section>
  )
}
