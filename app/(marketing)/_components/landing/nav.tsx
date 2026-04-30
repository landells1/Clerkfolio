import Link from 'next/link'
import { Logo } from './logo'

const links = [
  ['Product', '#features'],
  ["Who it's for", '#audience'],
  ['How it works', '#how'],
  ['Pricing', '#pricing'],
  ['FAQ', '#faq'],
] as const

export function Nav() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-white/[0.08] bg-[#0B0B0C]/85 px-6 py-5 backdrop-blur md:px-14">
      <div className="flex items-center gap-8 lg:gap-11">
        <Link href="/" className="flex items-center gap-2.5 rounded-sm">
          <Logo />
          <span className="text-base font-medium tracking-[-0.02em] text-ink">Clerkfolio</span>
          <span className="ml-1 rounded border border-white/[0.08] px-1.5 py-0.5 font-mono text-[11px] text-ink-dim">v0.1</span>
        </Link>
        <div className="hidden items-center gap-7 text-[13px] text-ink-soft md:flex">
          {links.map(([label, href]) => <a key={href} href={href} className="rounded-sm transition hover:text-ink">{label}</a>)}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/login" className="hidden rounded-sm text-[13px] text-ink-soft hover:text-ink sm:inline">Log in</Link>
        <Link href="/signup" className="rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-surface transition hover:brightness-110">
          Create your portfolio →
        </Link>
      </div>
    </nav>
  )
}
