import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalContactButton } from '@/components/legal/contact-modal'

export const metadata: Metadata = {
  title: 'Contact - Clerkfolio',
  description: 'Contact the Clerkfolio team.',
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center px-6 py-20 text-ink md:px-14">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-8">
        <Link href="/" className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">← Clerkfolio</Link>
        <h1 className="mt-8 text-4xl font-medium tracking-[-0.04em]">Contact</h1>
        <p className="mt-4 text-sm leading-6 text-ink-soft">
          Send a message to the Clerkfolio team. We&apos;ll reply by email.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <LegalContactButton />
          <a href="mailto:admin@clerkfolio.co.uk" className="rounded-lg border border-white/[0.08] px-4 py-3 text-sm font-semibold text-ink-soft transition-colors hover:text-ink">
            Email directly
          </a>
        </div>
      </div>
    </main>
  )
}
