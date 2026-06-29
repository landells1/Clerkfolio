import BackButton from '@/components/legal/back-button'
import LegalFooter from '@/components/legal/legal-footer'

const lastUpdated = '26 May 2026'

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-canvas)] px-6 py-12 text-[var(--text-primary)]">
      <article className="mx-auto max-w-4xl space-y-8">
        <BackButton />
        <header className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--accent-text)]">Legal</p>
          <h1 className="text-3xl font-semibold tracking-tight">Security policy</h1>
          <p className="text-sm text-[var(--text-secondary)]">Last updated: {lastUpdated}</p>
          <p className="max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
            Clerkfolio is committed to protecting the security of the service and the personal data
            of our users. We welcome good-faith security research and responsible disclosure.
          </p>
        </header>

        <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent)] px-5 py-4 text-sm leading-7 text-[var(--text-primary)]">
          <p className="font-semibold text-[var(--text-primary)] mb-1">Report a vulnerability</p>
          <p className="text-xs leading-6">
            Email{' '}
            <a href="mailto:admin@clerkfolio.co.uk" className="underline hover:text-[var(--text-primary)]">
              admin@clerkfolio.co.uk
            </a>{' '}
            with details of the issue. Please include steps to reproduce and any supporting
            evidence. We will acknowledge your report within 3 business days.
          </p>
        </div>

        <Section title="Vulnerability disclosure policy">
          <p>
            We operate a coordinated vulnerability disclosure programme. If you discover a security
            vulnerability in Clerkfolio, we ask that you report it to us privately before disclosing
            it publicly, giving us a reasonable opportunity to investigate and address the issue.
          </p>
        </Section>

        <Section title="Scope">
          <p>The following are in scope for security research:</p>
          <ul>
            <li>clerkfolio.co.uk and all subdomains</li>
            <li>The Clerkfolio web application (portfolio, case diary, sharing, exports, authentication)</li>
            <li>Clerkfolio application API routes that back the web app</li>
          </ul>
        </Section>

        <Section title="Out of scope">
          <p>The following are explicitly out of scope. Reports in these categories will not be acted upon and may void safe-harbour protections:</p>
          <ul>
            <li>Denial of service or resource exhaustion attacks of any kind (including volumetric, application-layer, or slowloris-style)</li>
            <li>Social engineering, phishing, or other attacks targeting Clerkfolio staff or users</li>
            <li>Physical attacks on infrastructure</li>
            <li>Issues in third-party services or infrastructure outside our reasonable control (Supabase, Vercel, Stripe, Resend, Upstash)</li>
            <li>Automated scanning of production systems without prior written permission</li>
            <li>Attacks against systems, accounts, or data belonging to other users without their consent</li>
            <li>Non-exploitable information disclosures with no realistic attack path (e.g. version banners, missing optional headers)</li>
            <li>Clickjacking on pages with no sensitive actions</li>
            <li>Missing DNSSEC, CAA records, or similar hardening that is not exploitable in context</li>
          </ul>
        </Section>

        <Section title="Safe harbour">
          <p>
            Clerkfolio will not pursue civil or criminal action against researchers who:
          </p>
          <ul>
            <li>Report vulnerabilities to us privately at admin@clerkfolio.co.uk before any public disclosure.</li>
            <li>Do not access, modify, or exfiltrate data beyond what is necessary to demonstrate the vulnerability.</li>
            <li>Do not disrupt or degrade the service for other users.</li>
            <li>Stay within the scope defined above.</li>
            <li>Act in good faith throughout the disclosure process.</li>
          </ul>
          <p>
            Good-faith research that complies with these guidelines is authorised. We will work with
            you to understand and address the issue quickly.
          </p>
        </Section>

        <Section title="Response SLA">
          <ul>
            <li><strong>Acknowledgement:</strong> within 3 business days of receiving your report.</li>
            <li><strong>Initial triage:</strong> within 10 business days.</li>
            <li><strong>Critical or high severity fix:</strong> we aim to deploy a fix within 30 calendar days of confirming the issue. We will keep you updated on progress.</li>
            <li><strong>Medium and low severity:</strong> addressed on a risk-based schedule; typically within 90 calendar days.</li>
          </ul>
          <p>
            We will co-ordinate a disclosure timeline with you and aim to allow public disclosure
            after a fix is deployed or after 90 days from the date of your report, whichever is sooner,
            unless we agree a different timeline in writing.
          </p>
        </Section>

        <Section title="Bug bounty and recognition">
          <p>
            Clerkfolio does not operate a paid bug bounty programme at this time. We may offer public
            credit (in a security acknowledgements page, if you consent) or a small token of appreciation
            at our discretion for valid, in-scope reports. We appreciate the time and skill of
            independent security researchers.
          </p>
        </Section>

        <Section title="Security measures overview">
          <p>
            Clerkfolio implements defence-in-depth across the application stack:
          </p>
          <ul>
            <li>Encryption at rest (Supabase managed encryption, eu-west-2) and in transit (HTTPS/TLS 1.2+)</li>
            <li>Row-level security (RLS) on all Supabase database tables</li>
            <li>Supabase Auth with PKCE flow; session management with expiry and revocation</li>
            <li>CSRF origin validation on all state-changing API routes</li>
            <li>Rate limiting via Upstash Redis on public and sensitive endpoints</li>
            <li>Hashed IP addresses and hashed PINs for share-link access control</li>
            <li>Server-side MIME type and file-format validation for evidence uploads; antivirus scanning is not currently provided</li>
            <li>Content Security Policy, X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy headers</li>
            <li>Soft-delete only across all user data; no immediate hard deletes</li>
            <li>Session fingerprint tracking to detect and revoke suspicious sessions</li>
          </ul>
          <p>
            More detail is available in our{' '}
            <a href="/dpa" className="underline hover:text-[var(--text-primary)]">Data Processing Agreement</a>.
            Third-party security posture is governed by each provider&apos;s own controls and certifications -
            see the{' '}
            <a href="/subprocessors" className="underline hover:text-[var(--text-primary)]">subprocessors page</a>.
          </p>
        </Section>

        <Section title="Contact">
          <ul>
            <li>Security reports: <a href="mailto:admin@clerkfolio.co.uk">admin@clerkfolio.co.uk</a></li>
            <li>General / data protection: <a href="mailto:admin@clerkfolio.co.uk">admin@clerkfolio.co.uk</a></li>
          </ul>
        </Section>
      </article>
      <LegalFooter />
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-white/[0.08] pt-6 text-sm leading-7 text-[var(--text-secondary)]">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
      {children}
    </section>
  )
}
