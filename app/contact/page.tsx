import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalContactButton } from '@/components/legal/contact-modal'

export const metadata: Metadata = {
  title: 'Contact — Clerkfolio',
  description: 'Contact the Clerkfolio team.',
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0C] px-6 py-20 text-ink md:px-14">
      <div className="mx-auto max-w-2xl rounded-2xl border border-white/[0.08] bg-[#141416] p-8">
        <Link href="/" className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">← Clerkfolio</Link>
        <h1 className="mt-8 text-4xl font-medium tracking-[-0.04em]">Contact</h1>
        <p className="mt-4 text-sm leading-6 text-ink-soft">
          Send a message to the Clerkfolio team. We&apos;ll reply by email.
        </p>
        <div className="mt-8 inline-flex rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold text-white">
          <LegalContactButton />
        </div>
      </div>
    </main>
  )
}
