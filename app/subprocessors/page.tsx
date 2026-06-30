import BackButton from '@/components/legal/back-button'
import LegalFooter from '@/components/legal/legal-footer'
import Link from 'next/link'

const lastUpdated = '28 June 2026'

type Subprocessor = {
  name: string
  location: string
  purpose: string
  privacyUrl: string
  dpaUrl: string
  transferMechanism: string | null
}

const subprocessors: Subprocessor[] = [
  {
    name: 'Supabase',
    location: 'European Union / United Kingdom (eu-west-2, London)',
    purpose: 'Postgres database, user authentication, row-level security, file storage, and Edge Functions. All application data and evidence files are stored in the eu-west-2 (London) region.',
    privacyUrl: 'https://supabase.com/privacy',
    dpaUrl: 'https://supabase.com/docs/company/data-processing-addendum',
    transferMechanism: null,
  },
  {
    name: 'Stripe',
    location: 'Ireland (EU) / United States',
    purpose: 'Subscription management, payment processing, billing portal, customer and subscription records, refunds, and payment disputes. Card data is handled entirely by Stripe and is not stored by Clerkfolio.',
    privacyUrl: 'https://stripe.com/gb/privacy',
    dpaUrl: 'https://stripe.com/gb/legal/dpa',
    transferMechanism: 'EU Standard Contractual Clauses; UK IDTA',
  },
  {
    name: 'Resend',
    location: 'United States',
    purpose: 'Transactional email delivery for account verification, security notifications, student email verification, and support/feedback routing.',
    privacyUrl: 'https://resend.com/legal/privacy-policy',
    dpaUrl: 'https://resend.com/legal/dpa',
    transferMechanism: 'EU-US Data Privacy Framework; UK Extension to the DPF',
  },
  {
    name: 'Vercel',
    location: 'United States (production deployments served from lhr1, London)',
    purpose: 'Application hosting, deployment infrastructure, and serverless compute. Vercel Analytics (aggregate, anonymised page-view data) is only enabled with user consent. Production edge traffic is served from the London region (lhr1).',
    privacyUrl: 'https://vercel.com/legal/privacy-policy',
    dpaUrl: 'https://vercel.com/legal/dpa',
    transferMechanism: 'EU-US Data Privacy Framework; Standard Contractual Clauses; UK IDTA',
  },
  {
    name: 'Sentry',
    location: 'European Union (Germany, de region)',
    purpose: 'Application error and performance monitoring used to detect, diagnose, and fix faults and keep the service secure and reliable. Diagnostic events are sent to Sentry’s EU region and are scrubbed before sending: no session replay, no default personal data, and cookies/authorisation headers are stripped. No portfolio content is sent.',
    privacyUrl: 'https://sentry.io/privacy/',
    dpaUrl: 'https://sentry.io/legal/dpa/',
    transferMechanism: null,
  },
  {
    name: 'Upstash',
    location: 'European Union (eu-west-1 region)',
    purpose: 'Serverless Redis used for rate limiting on API and authentication endpoints to protect the service from abuse. Stores only transient rate-limit counters keyed by hashed identifiers; no personal portfolio data is stored.',
    privacyUrl: 'https://upstash.com/trust/privacy.pdf',
    dpaUrl: 'https://upstash.com/trust/dpa.pdf',
    transferMechanism: null,
  },
]

export default function SubprocessorsPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-canvas)] px-6 py-12 text-[var(--text-primary)]">
      <article className="mx-auto max-w-4xl space-y-8">
        <BackButton />
        <header className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--accent-text)]">Legal</p>
          <h1 className="text-3xl font-semibold tracking-tight">Subprocessors</h1>
          <p className="text-sm text-[var(--text-secondary)]">Last updated: {lastUpdated}</p>
          <p className="max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
            This page lists the third-party subprocessors Clerkfolio uses to deliver the service.
            All subprocessors are engaged under written data processing agreements with obligations
            equivalent to those in our{' '}
            <Link href="/dpa" className="underline hover:text-[var(--text-primary)]">
              Data Processing Agreement
            </Link>
            .
          </p>
        </header>

        <div className="rounded-xl border border-accent/20 bg-accent/8 px-5 py-4 text-sm leading-7 text-[var(--text-primary)]">
          <p className="font-semibold text-[var(--text-primary)] mb-1">Stay informed</p>
          <p className="text-xs leading-6">
            To be notified of changes to this subprocessor list (at least 30 days in advance of any
            addition or replacement), email{' '}
            <a href="mailto:admin@clerkfolio.co.uk" className="underline hover:text-[var(--text-primary)]">
              admin@clerkfolio.co.uk
            </a>{' '}
            with the subject line &ldquo;Subscribe to subprocessor changes&rdquo;. See our{' '}
            <Link href="/dpa" className="underline hover:text-[var(--text-primary)]">DPA</Link> for your rights
            to object to new subprocessors.
          </p>
        </div>

        <div className="space-y-4">
          {subprocessors.map(sp => (
            <div
              key={sp.name}
              className="rounded-xl border border-white/[0.08] bg-[var(--bg-canvas)] px-5 py-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">{sp.name}</h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{sp.location}</p>
                </div>
                {sp.transferMechanism && (
                  <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] text-[var(--warning)]">
                    International transfer
                  </span>
                )}
              </div>
              <p className="text-sm leading-6 text-[var(--text-secondary)]">{sp.purpose}</p>
              {sp.transferMechanism && (
                <p className="text-xs text-[var(--text-secondary)]">
                  Transfer mechanism: {sp.transferMechanism}
                </p>
              )}
              <div className="flex flex-wrap gap-3 pt-1">
                <a
                  href={sp.privacyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--accent-text)] underline hover:text-[var(--accent-bright)] transition-colors"
                >
                  Privacy policy
                </a>
                <a
                  href={sp.dpaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--accent-text)] underline hover:text-[var(--accent-bright)] transition-colors"
                >
                  DPA / processing terms
                </a>
              </div>
            </div>
          ))}
        </div>

        <section className="space-y-3 border-t border-white/[0.08] pt-6 text-sm leading-7 text-[var(--text-secondary)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Contact</h2>
          <p>
            Questions about this list or our data processing practices should be sent to{' '}
            <a href="mailto:admin@clerkfolio.co.uk">admin@clerkfolio.co.uk</a>. See also our{' '}
            <Link href="/privacy" className="underline hover:text-[var(--text-primary)]">Privacy policy</Link>{' '}
            and{' '}
            <Link href="/dpa" className="underline hover:text-[var(--text-primary)]">Data processing agreement</Link>.
          </p>
        </section>
      </article>
      <LegalFooter />
    </main>
  )
}
