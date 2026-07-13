import BackButton from '@/components/legal/back-button'
import LegalFooter from '@/components/legal/legal-footer'
import Link from 'next/link'
import { LEGAL_ENTITY } from '@/lib/legal/entity'
import { marketingMetadata } from '@/lib/marketing/metadata'

export const metadata = marketingMetadata({
  title: 'Privacy policy - Clerkfolio',
  description: 'How Clerkfolio collects, uses, stores, and protects your personal data, and the rights you have under UK GDPR.',
  path: '/privacy',
})

const lastUpdated = '13 July 2026'

const dataRows = [
  {
    category: 'Account and profile',
    examples: 'Email address, password authentication data, name, career stage, onboarding status, student email verification status, referral code, notification preferences, and subscription tier.',
    purpose: 'To create and secure your account, personalise the service, manage entitlements, send service messages, and provide support.',
    lawfulBasis: 'Contract (Art 6(1)(b)); legitimate interests (Art 6(1)(f)) for security and abuse prevention; legal obligation (Art 6(1)(c)) where records are needed for compliance.',
  },
  {
    category: 'Portfolio content',
    examples: 'Portfolio entries, categories, dates, specialty tags, competency themes, notes, reflections, procedures, teaching, publications, prizes, leadership roles, audit or QIP details, and custom templates.',
    purpose: 'To store, organise, display, export, and share the portfolio content you choose to enter.',
    lawfulBasis: 'Contract (Art 6(1)(b)); legitimate interests (Art 6(1)(f)) for security, integrity, backup, and abuse prevention.',
  },
  {
    category: 'Anonymised case diary',
    examples: 'Case title, date, clinical area, specialty tags, competency themes, notes, pinned status, and importance rating.',
    purpose: 'To help you maintain a personal anonymised clinical diary. Case entries must be fully anonymised: our terms prohibit entering patient-identifiable information, and truly anonymised notes are not personal data about a patient. If we become aware of identifiable content we may restrict or remove it.',
    lawfulBasis: 'Contract (Art 6(1)(b)); legitimate interests (Art 6(1)(f)) for security and integrity.',
  },
  {
    category: 'Evidence files',
    examples: 'Uploaded file name, storage path, MIME type, file size, linked entry, upload date, and file verification status. Accepted formats include PDF, DOCX, XLSX, PPTX, TXT, PNG, JPG, JPEG, and HEIC.',
    purpose: 'To store evidence you upload, enforce storage limits, verify permitted file types and formats, and include eligible files in user-requested exports.',
    lawfulBasis: 'Contract (Art 6(1)(b)); legitimate interests (Art 6(1)(f)) in platform security.',
  },
  {
    category: 'Applications, timeline, and ARCP organisation',
    examples: 'Tracked specialty applications, scoring links, self-entered points claimed, ARCP capability links, goals, deadlines, calendar feed token, and completion status.',
    purpose: 'To organise your own portfolio against application and ARCP structures. Clerkfolio does not make readiness, competitiveness, or outcome predictions.',
    lawfulBasis: 'Contract (Art 6(1)(b)).',
  },
  {
    category: 'Sharing and exports',
    examples: 'Share link tokens, optional PIN hash, link scope, expiry, revocation status, view count, hashed viewer IP address, share access attempts, and export usage counters.',
    purpose: 'To create user-controlled public links, prevent unauthorised or excessive access, revoke suspicious links, and apply plan limits.',
    lawfulBasis: 'Contract (Art 6(1)(b)); legitimate interests (Art 6(1)(f)) in security and abuse prevention.',
  },
  {
    category: 'Payments and subscriptions',
    examples: 'Stripe customer ID, Stripe subscription ID, subscription period end, plan status, referral reward status, and feature usage counters. Card details are handled by Stripe, not Clerkfolio.',
    purpose: 'To provide paid plans, manage billing status, apply limits, cancel subscriptions on account deletion, and keep accounting records.',
    lawfulBasis: 'Contract (Art 6(1)(b)); legal obligation (Art 6(1)(c)) for tax, accounting, and dispute records.',
  },
  {
    category: 'Support, feedback, and emails',
    examples: 'Support messages, feedback form name, reply email, comment, notification emails, student verification emails, and delivery metadata handled by our email provider.',
    purpose: 'To respond to you, send requested or security-critical service emails, verify student status, and improve the service.',
    lawfulBasis: 'Contract (Art 6(1)(b)); legitimate interests (Art 6(1)(f)); consent (Art 6(1)(a)) where you opt into optional messages.',
  },
  {
    category: 'Technical and analytics data',
    examples: 'Authentication session cookies, request metadata, hashed IP addresses where needed for security, device/browser information, service worker data, and Vercel Analytics events.',
    purpose: 'To keep you signed in, run the site, protect the service, understand aggregate usage, diagnose problems, and improve performance.',
    lawfulBasis: 'Contract (Art 6(1)(b)) for essential cookies and service operation; legitimate interests (Art 6(1)(f)) for security; consent (Art 6(1)(a)) for optional analytics cookies.',
  },
]

const processors = [
  {
    name: 'Supabase',
    description: 'Authentication, Postgres database, storage, row level security, and Edge Functions. Application data and evidence storage are configured for London, United Kingdom (eu-west-2).',
  },
  {
    name: 'Vercel',
    description: 'Hosting, deployment, request handling, and Vercel Analytics (with consent). Production deployments served from the London region (lhr1). See international transfers below.',
  },
  {
    name: 'Stripe',
    description: 'Subscription checkout, billing portal, customer and subscription records, payment processing, fraud checks, refunds, and payment disputes. Stripe is registered in Ireland.',
  },
  {
    name: 'Resend',
    description: 'Transactional email delivery for verification, notifications, security messages, and feedback/support routing. Resend is based in the United States - see international transfers below.',
  },
  {
    name: 'Upstash',
    description: 'Serverless Redis used for rate limiting on API and authentication endpoints. Data stored in the EU (eu-west-1). No personal portfolio data is stored; only transient rate-limit counters.',
  },
]

const changelog = [
  {
    date: '6 July 2026',
    changes: 'Removed the Article 9(2)(a) explicit-consent lawful basis for incidental third-party health data: consent from the account holder cannot cover a patient, and the correct position is that Clerkfolio requires full anonymisation (anonymised information is not personal data). Removed the standing public DPA (no institutional customers; bilateral DPAs on request). Corrected the analytics-consent description to match the actual off-by-default footer control.',
  },
  {
    date: '28 June 2026',
    changes: 'Corrected the operator disclosure: Clerkfolio is operated by an individual (a sole trader) in the UK, not a limited company. Added placeholders for the proprietor name, address for service, and ICO registration reference. Consolidated the published contact address to admin@clerkfolio.co.uk.',
  },
  {
    date: '26 May 2026',
    changes: 'Clarified that evidence upload controls verify permitted file types and formats; Clerkfolio does not currently claim antivirus scanning of uploaded evidence.',
  },
  {
    date: '15 May 2026',
    changes: 'Added Art 9 lawful basis for case diary health data; added ICO registration placeholder; expanded international transfers section to include DPF and IDTA details; added Upstash to processors; added links to Cookie policy and DPA; added changelog.',
  },
  {
    date: '29 April 2026',
    changes: 'Initial published version.',
  },
]

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-canvas)] px-6 py-12 text-[var(--text-primary)]">
      <article className="mx-auto max-w-4xl space-y-8">
        <BackButton />
        <header className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--accent-text)]">Legal</p>
          <h1 className="text-3xl font-semibold tracking-tight">Privacy policy</h1>
          <p className="text-sm text-[var(--text-secondary)]">Last updated: {lastUpdated}</p>
          <p className="max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
            This policy explains how Clerkfolio collects, uses, stores, shares, and protects personal data when you use
            Clerkfolio. Clerkfolio is a UK medical portfolio organisation tool for medical students, foundation doctors,
            and doctors preparing portfolio material. It is designed for anonymised case notes and personal portfolio
            records, not patient-identifiable clinical records.
          </p>
        </header>

        <Notice>
          You must not enter patient names, NHS numbers, hospital numbers, dates of birth, addresses, precise rare-case
          identifiers, or any other patient-identifiable information into Clerkfolio. If you choose to enter information
          about another person despite this policy and our terms, you are responsible for making sure you have an
          appropriate professional, ethical, and legal basis to do so.
        </Notice>

        <Section title="Who we are and how to contact us">
          <p>
            Clerkfolio is an independent service operated by an individual (a sole trader) based in the United
            Kingdom; it is not a limited company.
            {LEGAL_ENTITY.proprietorName ? ` The service is provided by ${LEGAL_ENTITY.proprietorName}.` : ''} For
            privacy requests, data subject rights, or questions about this policy, contact{' '}
            <a href={`mailto:${LEGAL_ENTITY.contactEmail}`}>{LEGAL_ENTITY.contactEmail}</a>.
          </p>
          {LEGAL_ENTITY.addressForService ? (
            <p>Address for service of documents: {LEGAL_ENTITY.addressForService}.</p>
          ) : null}
          {LEGAL_ENTITY.icoReference ? (
            <p>
              Clerkfolio is registered with the Information Commissioner&apos;s Office (ICO) under data protection
              registration reference {LEGAL_ENTITY.icoReference}.
            </p>
          ) : null}
          <p>
            If you are in the United Kingdom, you also have the right to complain to the Information Commissioner&apos;s
            Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="underline">ico.org.uk</a> or
            by calling 0303 123 1113. We ask that you contact us first where possible so we can try to resolve the issue.
          </p>
        </Section>

        <Section title="What we collect and why">
          <p>
            The data we collect depends on the features you use. The table below summarises the main categories currently
            reflected in the Clerkfolio app and Supabase database, together with the specific lawful basis under UK GDPR.
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="min-w-[760px] border-collapse text-left text-xs leading-6">
              <thead className="bg-white/[0.04] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Examples</th>
                  <th className="px-4 py-3 font-semibold">Purpose</th>
                  <th className="px-4 py-3 font-semibold">Lawful basis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {dataRows.map(row => (
                  <tr key={row.category} className="align-top">
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{row.category}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{row.examples}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{row.purpose}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{row.lawfulBasis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Special category data and clinical confidentiality">
          <p>
            Clerkfolio is not intended to collect patient health data, patient identifiers, or formal clinical records.
            Case entries should be anonymised training notes only. Removing a name alone may not be enough if a
            combination of details could still identify a patient, so you should generalise or omit unnecessary details.
          </p>
          <p>
            Information that has been properly anonymised is not personal data about a patient, so entering it does
            not involve processing patient data under UK GDPR. That is why anonymisation is a strict condition of
            using Clerkfolio, set out in our{' '}
            <Link href="/terms" className="underline hover:text-[var(--text-primary)]">Terms of service</Link>: you must
            not enter information that could identify a patient, and you remain responsible for anonymising anything
            you record.
          </p>
          <p>
            If we become aware that content appears to contain patient-identifiable information, we may ask you to edit it,
            restrict the content, suspend sharing, or remove it where necessary to protect patients, comply with law, or
            protect the service.
          </p>
        </Section>

        <Section title="Where data is stored">
          <p>
            Clerkfolio stores application records and evidence files in Supabase. The project is configured for London,
            United Kingdom hosting (eu-west-2) for the core database and storage.
          </p>
        </Section>

        <Section title="International transfers">
          <p>
            Some of our subprocessors are based outside the UK or transfer limited data outside the UK/EEA:
          </p>
          <ul>
            <li>
              <strong>Resend</strong> (US): email delivery. Transfers are covered by the UK International Data Transfer
              Agreement (IDTA) or Standard Contractual Clauses, and Resend participates in the EU-US Data Privacy
              Framework (DPF).
            </li>
            <li>
              <strong>Vercel</strong> (US): hosting infrastructure. Production traffic is served from the London
              region (lhr1). Limited infrastructure data may be processed in the US under the DPF and UK IDTA.
            </li>
            <li>
              <strong>Stripe</strong> (Ireland/US): payment processing. Stripe is established in Ireland (EU) and
              uses SCCs and the DPF for onward transfers.
            </li>
          </ul>
          <p>
            Full details of transfer mechanisms are on the{' '}
            <Link href="/subprocessors" className="underline hover:text-[var(--text-primary)]">Subprocessors page</Link>.
          </p>
          {/* DPF in force as of May 2026. Clerkfolio's exposure is low: clinical content stays in Supabase eu-west-2; only email/name (Resend) and request metadata (Vercel) reach US infrastructure. UK IDTA is the fallback if DPF is invalidated. Monitor noyb.eu for challenge outcomes. */}
        </Section>

        <Section title="Processors and third parties">
          <p>
            We use the following main providers to operate Clerkfolio. Full details, transfer mechanisms, and links
            to each provider&apos;s DPA are at{' '}
            <Link href="/subprocessors" className="underline hover:text-[var(--text-primary)]">clerkfolio.co.uk/subprocessors</Link>:
          </p>
          <ul>
            {processors.map(({ name, description }) => (
              <li key={name}>
                <strong>{name}:</strong> {description}
              </li>
            ))}
          </ul>
          <p>
            We may also disclose information if required by law, to enforce our terms, to protect users or patients, to
            investigate abuse or security incidents, or in connection with a restructuring, acquisition, or sale of the
            service.
          </p>
        </Section>

        <Section title="User-controlled sharing">
          <p>
            You can generate portfolio share links with a chosen scope, expiry date, and optional PIN. Anyone with a valid
            link, and the PIN where enabled, may view the shared portfolio content until the link expires, is revoked, or
            is automatically paused after unusual traffic. Share link access may record hashed IP addresses and access
            attempts for abuse prevention and audit purposes.
          </p>
          <p>
            Calendar feed tokens work like secret links. If you enable or share one, anyone with the token may be able to
            access the calendar feed until you rotate or disable it.
          </p>
        </Section>

        <Section title="Cookies, analytics, and local storage">
          <p>
            Clerkfolio uses essential authentication cookies and similar technologies to keep you signed in, secure your
            session, remember requested service state, and run the web app. Optional analytics is off by default and is
            only loaded if you enable it via the Analytics preferences control in the page footer. Full details are in our{' '}
            <Link href="/cookies" className="underline hover:text-[var(--text-primary)]">Cookie policy</Link>.
          </p>
          <p>
            Vercel Analytics is used to understand aggregate product usage and performance. It is off by default and only
            loaded if you accept analytics cookies. We do not sell or broker personal data.
          </p>
        </Section>

        <Section title="Retention">
          <ul>
            <li>Live account, profile, portfolio, case, timeline, specialty, ARCP, template, and evidence records are kept while your account remains active or as needed to provide the service. We delete accounts that have not signed in for two years, including their associated live data. If an inactive account has a paid subscription, we first arrange for that subscription to end at the close of its paid period.</li>
            <li>Soft-deleted portfolio entries and cases remain available in trash for a limited period and are currently scheduled for purge after 30 days.</li>
            <li>After account deletion, personal data is removed from live systems promptly. Backup copies may be retained for up to 30 days before being purged in the normal backup rotation. Stripe billing records and any data we are legally required to retain (e.g. for tax or dispute purposes) are kept for the legally required period.</li>
            <li>Audit logs are currently scheduled for purge after one year.</li>
            <li>Share links expire no later than 90 days after creation or extension, unless revoked sooner.</li>
            <li>Student verification tokens expire after 24 hours.</li>
          </ul>
        </Section>

        <Section title="Account deletion and export">
          <p>
            You can export your account data from Clerkfolio. The account export includes database-shaped records and
            readable JSON, and may include verified evidence files where available. You can also delete your account from the
            app. Account deletion cancels any active Clerkfolio Stripe subscription where possible, removes stored evidence
            files, and deletes the Supabase user account. Some information may remain temporarily in backups, payment
            records, provider logs, or records we must keep for legal, tax, security, or dispute purposes.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            Under UK GDPR you may have rights to: access your personal data; rectify inaccurate data; erase your data
            (right to be forgotten); restrict or object to processing; receive a portable copy of your data; and withdraw
            consent where processing is based on consent. Some rights are not absolute - for example, we may need to keep
            limited data for legal compliance, security, or dispute handling.
          </p>
          <p>
            To exercise any right, contact <a href="mailto:admin@clerkfolio.co.uk">admin@clerkfolio.co.uk</a>. We aim to
            respond within one month and may ask you to verify your identity before acting. The ICO may also be contacted
            directly at <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener noreferrer" className="underline">ico.org.uk/make-a-complaint</a>.
          </p>
        </Section>

        <Section title="Security">
          <p>
            Clerkfolio uses Supabase authentication, row level security, private storage paths, plan-aware upload checks,
            CSRF origin validation on sensitive routes, server-side file type and format checks, hashed PINs for
            protected share links, hashed IP addresses for share access records, and rate limiting on selected public
            endpoints. No online service can guarantee perfect security, so you should use a strong unique password and
            avoid entering sensitive information that Clerkfolio does not need.
          </p>
          <p>
            Data is encrypted at rest by Supabase (eu-west-2). See{' '}
            <Link href="/security" className="underline hover:text-[var(--text-primary)]">our security policy</Link> and{' '}
            <a href="mailto:admin@clerkfolio.co.uk">admin@clerkfolio.co.uk</a> to report vulnerabilities.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this policy as Clerkfolio changes or legal requirements develop. Material changes will be
            reflected by updating the date above and, where appropriate, by giving in-app or email notice.
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/[0.08] mt-4">
            <table className="min-w-[400px] border-collapse text-left text-xs leading-6">
              <thead className="bg-white/[0.04] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Changes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {changelog.map(row => (
                  <tr key={row.date} className="align-top">
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)] whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{row.changes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </article>
      <LegalFooter />
    </main>
  )
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-4 text-sm leading-7 text-[var(--text-primary)]">
      {children}
    </div>
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
