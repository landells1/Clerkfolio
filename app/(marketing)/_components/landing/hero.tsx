import Link from 'next/link'
import { FloatingCaseCard } from './mocks/floating-case-card'
import { FloatingChecklistCard } from './mocks/floating-checklist-card'
import { MockCasesList } from './mocks/mock-cases-list'
import { MonoLabel } from './mono-label'

export function Hero() {
  return (
    <section className="px-6 py-16 md:px-14 lg:py-20">
      <div className="mb-10">
        <MonoLabel className="text-accent">◉ Portfolio · built like a reference</MonoLabel>
      </div>
      <div className="grid items-center gap-[60px] lg:grid-cols-[minmax(0,1fr)_600px]">
        <div>
          <h1 className="text-[clamp(54px,6vw,84px)] font-medium leading-[1.02] tracking-[-0.055em] text-ink">
            Every case,<br />
            every audit,<br />
            every reflection —<br />
            <span className="bg-[linear-gradient(100deg,oklch(0.82_0.13_195)_0%,oklch(0.7_0.13_250)_100%)] bg-clip-text font-normal italic text-transparent">
              In one place.
            </span>
          </h1>
          <p className="mt-9 max-w-[540px] text-lg leading-[1.55] text-ink-soft">
            Anonymised case logging. Portfolio entries that map cleanly onto every specialty&apos;s self-assessment. ARCP-ready exports the moment you need them.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-lg bg-accent px-6 py-3.5 text-sm font-semibold text-surface">Create your portfolio</Link>
            <a href="#how" className="rounded-lg border border-white/[0.15] px-6 py-3.5 text-sm font-medium text-ink">See how it works</a>
          </div>
          <div className="mt-8 flex flex-wrap gap-[18px] font-mono text-[11px] uppercase tracking-[0.05em] text-ink-dim">
            <span><span aria-hidden>◆</span> UK-hosted · London</span>
            <span><span aria-hidden>◆</span> AES-256 encrypted</span>
            <span><span aria-hidden>◆</span> Fully exportable</span>
          </div>
        </div>
        <div className="relative min-h-[520px] overflow-visible lg:-mr-10">
          <MockCasesList className="h-[500px]" />
          <div aria-hidden="true" className="absolute bottom-4 right-2 hidden lg:block"><FloatingCaseCard /></div>
          <div aria-hidden="true" className="absolute left-[-28px] top-[190px] hidden lg:block"><FloatingChecklistCard /></div>
        </div>
      </div>
    </section>
  )
}
