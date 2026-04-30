import Link from 'next/link'
import { Logo } from './logo'

export function CtaFooter() {
  return (
    <footer className="border-t border-white/[0.08] px-6 py-20 md:px-14 lg:py-28">
      <div className="mx-auto max-w-4xl text-center">
        <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">§ 007 · Begin</p>
        <h2 className="text-[clamp(56px,7vw,96px)] font-medium leading-none tracking-[-0.055em]">
          Start the<br />
          <span className="bg-[linear-gradient(100deg,oklch(0.82_0.13_195),oklch(0.7_0.13_260))] bg-clip-text font-normal italic text-transparent">
            record you&apos;ll keep.
          </span>
        </h2>
        <p className="mx-auto mt-8 max-w-xl text-lg leading-[1.55] text-ink-soft">
          Free during early access — and free forever, if that&apos;s all you need. Your portfolio, portable for as long as you&apos;re a doctor.
        </p>
        <Link href="/signup" className="mt-10 inline-flex rounded-lg bg-accent px-8 py-4 text-sm font-semibold text-surface">
          Create your portfolio · free
        </Link>
      </div>
      <div className="mt-24 flex flex-col gap-6 border-t border-white/[0.08] pt-7 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-dim sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5"><Logo /><span>Clerkfolio · 2026</span></div>
        <div className="flex gap-7">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </div>
    </footer>
  )
}
