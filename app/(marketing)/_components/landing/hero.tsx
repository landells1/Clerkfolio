import Link from 'next/link'
import { FloatingCaseCard } from './mocks/floating-case-card'
import { FloatingChecklistCard } from './mocks/floating-checklist-card'
import { MockCasesList } from './mocks/mock-cases-list'
import { MonoLabel } from './mono-label'

export function Hero() {
  return (
    <section className="px-6 py-12 sm:py-16 md:px-14 lg:py-20">
      <div className="mb-6 sm:mb-10">
        <MonoLabel className="text-accent">◉ Portfolio · built like a reference</MonoLabel>
      </div>
      <div className="grid items-center gap-10 sm:gap-[60px] lg:grid-cols-[minmax(0,1fr)_600px]">
        <div>
          <h1 className="text-[clamp(36px,9.5vw,54px)] font-medium leading-[1.02] tracking-[-0.055em] text-ink lg:text-[clamp(54px,6vw,84px)]">
            Every case,<br />
            Every audit,<br />
            Every reflection -<br />
            <span className="bg-[image:var(--accent-gradient)] bg-clip-text font-normal italic text-transparent">
              In one place.
            </span>
          </h1>
          <p className="mt-5 max-w-[540px] text-base leading-[1.55] text-ink-soft sm:mt-9 sm:text-lg">
            Anonymised case logging. Portfolio entries that map cleanly onto every specialty&apos;s self-assessment. ARCP-ready exports the moment you need them.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap">
            <Link href="/signup" className="inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3.5 text-sm font-semibold text-white">Create your portfolio</Link>
            <a href="#how" className="inline-flex items-center justify-center rounded-lg border border-strong px-6 py-3.5 text-sm font-medium text-ink">See how it works</a>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-[18px] gap-y-2 font-mono text-[11px] uppercase tracking-[0.05em] text-ink-dim sm:mt-8">
            <span><span aria-hidden>◆</span> UK-hosted · London</span>
            <span><span aria-hidden>◆</span> AES-256 encrypted</span>
            <span><span aria-hidden>◆</span> Fully exportable</span>
          </div>
        </div>
        <div className="relative overflow-visible lg:-mr-10 lg:min-h-[520px]">
          <MockCasesList className="h-auto lg:h-[500px]" />
          <div aria-hidden="true" className="absolute bottom-4 right-2 hidden lg:block"><FloatingCaseCard /></div>
          <div aria-hidden="true" className="absolute left-[-28px] top-[190px] hidden lg:block"><FloatingChecklistCard /></div>
        </div>
      </div>
    </section>
  )
}
