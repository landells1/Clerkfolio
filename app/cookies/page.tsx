import BackButton from '@/components/legal/back-button'
import LegalFooter from '@/components/legal/legal-footer'
import Link from 'next/link'

const lastUpdated = '9 June 2026'

type CookieRow = {
  name: string
  type: 'cookie' | 'localStorage' | 'sessionStorage' | 'cacheAPI'
  category: 'strictly-necessary' | 'analytics' | 'payment'
  purpose: string
  expiry: string
  setBy: string
}

const rows: CookieRow[] = [
  {
    name: 'sb-[ref]-auth-token',
    type: 'cookie',
    category: 'strictly-necessary',
    purpose: 'Stores your Supabase authentication session so you remain signed in across page loads.',
    expiry: 'Session (refreshed by Supabase SSR on each authenticated request)',
    setBy: 'Supabase SSR (@supabase/ssr) via Next.js middleware',
  },
  {
    name: 'sb-[ref]-auth-token-code-verifier',
    type: 'cookie',
    category: 'strictly-necessary',
    purpose: 'PKCE code verifier used during the OAuth sign-in flow. Cleared after sign-in completes.',
    expiry: 'Session (cleared on sign-in completion)',
    setBy: 'Supabase SSR (@supabase/ssr)',
  },
  {
    name: 'cf_consent_v1',
    type: 'localStorage',
    category: 'strictly-necessary',
    purpose: 'Records your cookie consent choice (analytics: true/false, timestamp, schema version). Used to decide whether to load Vercel Analytics.',
    expiry: 'Persistent until you clear browser storage or change your preferences',
    setBy: 'Clerkfolio (analytics preferences control)',
  },
  {
    name: 'clerkfolio-case-draft',
    type: 'sessionStorage',
    category: 'strictly-necessary',
    purpose: 'Temporarily saves an unsaved case-diary draft (title, date, clinical area, specialty tags) so it is not lost if you navigate away. Clinical free-text notes are intentionally excluded.',
    expiry: 'Session (cleared when the browser tab is closed or 24 h intent)',
    setBy: 'Clerkfolio (case entry form)',
  },
  {
    name: 'clerkfolio-[category]-draft:[user-id]',
    type: 'sessionStorage',
    category: 'strictly-necessary',
    purpose: 'Temporarily saves unsaved portfolio draft structure such as title, date, category, tags, and non-clinical metadata. Clinical free-text notes and reflections are intentionally excluded.',
    expiry: 'Session (cleared when the browser tab is closed, on logout, or after 24 h)',
    setBy: 'Clerkfolio (portfolio entry form)',
  },
  {
    name: 'clerkfolio-filters:* and view preferences',
    type: 'localStorage',
    category: 'strictly-necessary',
    purpose: 'Remembers non-sensitive UI state such as filters, sort order, density, chart view, dashboard section state, and accessibility display preferences.',
    expiry: 'Persistent until you clear browser storage or log out',
    setBy: 'Clerkfolio interface',
  },
  {
    name: 'clerkfolio-offline-latest',
    type: 'localStorage',
    category: 'strictly-necessary',
    purpose: 'Stores the latest dashboard/offline summary so the app shell can show recent account state if the connection drops. Cleared on logout.',
    expiry: 'Persistent until refreshed, cleared by the service worker, or cleared on logout',
    setBy: 'Clerkfolio offline cache primer',
  },
  {
    name: 'clerkfolio-share-pin:[token]',
    type: 'sessionStorage',
    category: 'strictly-necessary',
    purpose: 'Remembers a PIN entered for a public share link during the current tab session so viewers do not need to re-enter it on refresh.',
    expiry: 'Session (cleared when the browser tab is closed)',
    setBy: 'Clerkfolio public share viewer',
  },
  {
    name: 'Clerkfolio app cache',
    type: 'cacheAPI',
    category: 'strictly-necessary',
    purpose: 'The service worker (sw.js) caches static app assets to allow the app shell to load offline and to speed up subsequent visits. Cleared on logout.',
    expiry: 'Persistent until the service worker clears its cache or the user logs out',
    setBy: 'Clerkfolio service worker (sw.js)',
  },
  {
    name: 'Vercel Analytics',
    type: 'cookie',
    category: 'analytics',
    purpose: 'Collects anonymised, aggregate page-view data (path, referrer, country, device type) to help us understand how the app is used. Vercel Analytics uses a privacy-preserving approach and does not set persistent cross-site tracking cookies. No personal data is shared with third parties.',
    expiry: 'Session-level beacon only; no persistent cookies set on clerkfolio.co.uk by this service',
    setBy: 'Vercel Analytics (@vercel/analytics) - only loaded if you accept analytics cookies',
  },
  {
    name: 'Stripe checkout cookies',
    type: 'cookie',
    category: 'payment',
    purpose: 'Stripe sets its own cookies on its domains (js.stripe.com, hooks.stripe.com) to enable fraud detection, 3DS authentication, and payment processing. These are set only when you visit the upgrade/checkout page.',
    expiry: 'See Stripe\'s cookie policy',
    setBy: 'Stripe (stripe.com) - third-party cookies set on Stripe\'s own domains, not on clerkfolio.co.uk',
  },
]

const categoryLabel: Record<CookieRow['category'], string> = {
  'strictly-necessary': 'Strictly necessary',
  analytics: 'Analytics',
  payment: 'Payment',
}

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0C] px-6 py-12 text-[#F5F5F2]">
      <article className="mx-auto max-w-4xl space-y-8">
        <BackButton />
        <header className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#1B6FD9]">Legal</p>
          <h1 className="text-3xl font-semibold tracking-tight">Cookie policy</h1>
          <p className="text-sm text-[rgba(245,245,242,0.55)]">Last updated: {lastUpdated}</p>
          <p className="max-w-3xl text-sm leading-7 text-[rgba(245,245,242,0.72)]">
            This page lists every cookie, browser storage key, and similar technology used by Clerkfolio.
            We use strictly necessary storage to operate the service, and optional analytics storage only
            with your consent. You can change your preferences at any time below.
          </p>
        </header>

        <Section title="Your choices">
          <p>
            Optional analytics is off by default, so essential-only visitors are not interrupted by a
            consent banner. Select <strong>Analytics preferences</strong> in the page footer to enable or
            disable aggregate analytics. Your preference is stored in
            <code className="mx-1 rounded bg-white/[0.06] px-1 py-0.5 text-xs">cf_consent_v1</code>
            in your browser&apos;s local storage.
          </p>
          <p>
            You can revisit the footer control at any time to change this choice, or clear your browser&apos;s
            local storage for clerkfolio.co.uk to return to the default analytics-off state.
          </p>
        </Section>

        <Section title="Categories">
          <ul>
            <li>
              <strong>Strictly necessary</strong> - Required for the service to function or to keep it
              secure and reliable. Authentication sessions, consent records, the PWA offline cache, and
              error/performance diagnostics (Sentry, see below). These cannot be turned off.
            </li>
            <li>
              <strong>Analytics</strong> - Aggregate, anonymised usage data. Off by default. Loaded only
              if you choose to accept analytics cookies.
            </li>
            <li>
              <strong>Payment</strong> - Stripe scripts loaded only on the upgrade/checkout page.
              Technically required at that point to process your payment securely.
            </li>
          </ul>
        </Section>

        <Section title="Full cookie list">
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="min-w-[700px] border-collapse text-left text-xs leading-6">
              <thead className="bg-white/[0.04] text-[rgba(245,245,242,0.7)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name / key</th>
                  <th className="px-4 py-3 font-semibold">Storage</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Purpose</th>
                  <th className="px-4 py-3 font-semibold">Expiry</th>
                  <th className="px-4 py-3 font-semibold">Set by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {rows.map(row => (
                  <tr key={row.name} className="align-top">
                    <td className="px-4 py-3 font-mono text-[11px] text-[#F5F5F2]">{row.name}</td>
                    <td className="px-4 py-3 text-[rgba(245,245,242,0.68)]">
                      {row.type === 'cookie' && 'HTTP cookie'}
                      {row.type === 'localStorage' && 'localStorage'}
                      {row.type === 'sessionStorage' && 'sessionStorage'}
                      {row.type === 'cacheAPI' && 'Cache API (SW)'}
                    </td>
                    <td className="px-4 py-3 text-[rgba(245,245,242,0.68)]">{categoryLabel[row.category]}</td>
                    <td className="px-4 py-3 text-[rgba(245,245,242,0.68)]">{row.purpose}</td>
                    <td className="px-4 py-3 text-[rgba(245,245,242,0.68)]">{row.expiry}</td>
                    <td className="px-4 py-3 text-[rgba(245,245,242,0.68)]">{row.setBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Do Not Track">
          <p>
            Optional analytics remains off unless you explicitly enable it, regardless of your browser&apos;s{' '}
            <code className="rounded bg-white/[0.06] px-1 py-0.5 text-xs">DNT</code> setting. Strictly
            necessary storage is unaffected.
          </p>
        </Section>

        <Section title="Error and performance monitoring (Sentry)">
          <p>
            We use <strong>Sentry</strong> to monitor errors and performance so we can detect and fix
            faults and keep the service secure and reliable. We treat this as{' '}
            <strong>strictly necessary</strong> diagnostics (legitimate interest in service security and
            reliability), so it runs without a separate consent toggle and is not part of the optional
            Analytics control.
          </p>
          <p>
            Sentry does <strong>not</strong> set cookies on clerkfolio.co.uk and does not use session
            replay. Diagnostic events are sent to Sentry&apos;s EU region and are scrubbed before sending:
            default personal data is disabled, and cookies and authorisation headers are stripped. No
            portfolio content is sent. Sentry is listed on our{' '}
            <Link href="/subprocessors" className="underline hover:text-[#F5F5F2]">Subprocessors page</Link>.
          </p>
        </Section>

        <Section title="Third-party cookies">
          <p>
            Stripe sets cookies on its own domains only. We have no control over those cookies.
            See{' '}
            <a
              href="https://stripe.com/gb/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#F5F5F2]"
            >
              Stripe&apos;s privacy policy
            </a>{' '}
            for details.
          </p>
          <p>
            Vercel Analytics sends beacon data to Vercel&apos;s servers but does not set persistent
            tracking cookies on clerkfolio.co.uk.
          </p>
        </Section>

        <Section title="More information">
          <p>
            See our <Link href="/privacy" className="underline hover:text-[#F5F5F2]">Privacy policy</Link>{' '}
            and{' '}
            <Link href="/subprocessors" className="underline hover:text-[#F5F5F2]">Subprocessors list</Link>{' '}
            for more on how we handle your data. Questions can be sent to{' '}
            <a href="mailto:admin@clerkfolio.co.uk">admin@clerkfolio.co.uk</a>.
          </p>
        </Section>
      </article>
      <LegalFooter />
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-white/[0.08] pt-6 text-sm leading-7 text-[rgba(245,245,242,0.72)]">
      <h2 className="text-lg font-semibold text-[#F5F5F2]">{title}</h2>
      {children}
    </section>
  )
}
