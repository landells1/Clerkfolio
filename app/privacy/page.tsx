import BackButton from '@/components/legal/back-button'

const lastUpdated = '29 April 2026'

const dataRows = [
  {
    category: 'Account and profile',
    examples: 'Email address, password authentication data, name, career stage, onboarding status, student email verification status, referral code, notification preferences, and subscription tier.',
    purpose: 'To create and secure your account, personalise the service, manage entitlements, send service messages, and provide support.',
    lawfulBasis: 'Contract, legitimate interests, and legal obligation where records are needed for compliance.',
  },
  {
    category: 'Portfolio content',
    examples: 'Portfolio entries, categories, dates, specialty tags, competency themes, notes, reflections, procedures, teaching, publications, prizes, leadership roles, audit or QIP details, custom templates, and revision snapshots.',
    purpose: 'To store, organise, restore, display, export, and share the portfolio content you choose to enter.',
    lawfulBasis: 'Contract. Legitimate interests for security, integrity, backup, and abuse prevention.',
  },
  {
    category: 'Anonymised case diary',
    examples: 'Case title, date, clinical area, specialty tags, competency themes, notes, pinned status, completeness score, and revision snapshots.',
    purpose: 'To help you maintain a personal anonymised clinical diary. Clerkfolio is not designed for patient-identifiable data.',
    lawfulBasis: 'Contract. Legitimate interests for security, integrity, backup, and abuse prevention.',
  },
  {
    category: 'Evidence files',
    examples: 'Uploaded file name, storage path, MIME type, file size, linked entry, upload date, and virus scan status. Accepted formats include PDF, DOCX, XLSX, PPTX, TXT, PNG, JPG, JPEG, and HEIC.',
    purpose: 'To store evidence you upload, enforce storage limits, scan files for malware, and include eligible files in user-requested exports.',
    lawfulBasis: 'Contract and legitimate interests in platform security.',
  },
  {
    category: 'Applications, timeline, and ARCP organisation',
    examples: 'Tracked specialty applications, scoring links, self-entered points claimed, ARCP capability links, goals, deadlines, calendar feed token, and completion status.',
    purpose: 'To organise your own portfolio against application and ARCP structures. Clerkfolio does not make readiness, competitiveness, or outcome predictions.',
    lawfulBasis: 'Contract.',
  },
  {
    category: 'Sharing and exports',
    examples: 'Share link tokens, optional PIN hash, link scope, expiry, revocation status, view count, hashed viewer IP address, share access attempts, and export usage counters.',
    purpose: 'To create user-controlled public links, prevent unauthorised or excessive access, revoke suspicious links, and apply plan limits.',
    lawfulBasis: 'Contract and legitimate interests in security and abuse prevention.',
  },
  {
    category: 'Payments and subscriptions',
    examples: 'Stripe customer ID, Stripe subscription ID, subscription period end, plan status, referral Pro status, and feature usage counters. Card details are handled by Stripe, not Clerkfolio.',
    purpose: 'To provide paid plans, manage billing status, apply limits, cancel subscriptions on account deletion, and keep accounting records.',
    lawfulBasis: 'Contract and legal obligation for tax, accounting, and dispute records.',
  },
  {
    category: 'Support, feedback, and emails',
    examples: 'Support messages, feedback form name, reply email, comment, notification emails, student verification emails, and delivery metadata handled by our email provider.',
    purpose: 'To respond to you, send requested or security-critical service emails, verify student status, and improve the service.',
    lawfulBasis: 'Contract, legitimate interests, and consent where you opt into optional messages.',
  },
  {
    category: 'Technical and analytics data',
    examples: 'Authentication session cookies, request metadata, IP address where needed for security, device/browser information, service worker data, and Vercel Analytics events.',
    purpose: 'To keep you signed in, run the site, protect the service, understand aggregate usage, diagnose problems, and improve performance.',
    lawfulBasis: 'Contract for essential cookies and service operation; legitimate interests or consent where required for analytics or non-essential storage.',
  },
]

const processors = [
  ['Supabase', 'Authentication, Postgres database, storage, row level security, and Edge Functions. Application data and evidence storage are configured for London, United Kingdom.'],
  ['Vercel', 'Hosting, deployment, request handling, and Vercel Analytics.'],
  ['Stripe', 'Subscription checkout, billing portal, customer and subscription records, payment processing, fraud checks, refunds, and payment disputes.'],
  ['Resend', 'Transactional email delivery for verification, notifications, security messages, and feedback/support routing.'],
]

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0C] px-6 py-12 text-[#F5F5F2]">
      <article className="mx-auto max-w-4xl space-y-8">
        <BackButton />
        <header className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#1B6FD9]">Legal</p>
          <h1 className="text-3xl font-semibold tracking-tight">Privacy policy</h1>
          <p className="text-sm text-[rgba(245,245,242,0.55)]">Last updated: {lastUpdated}</p>
          <p className="max-w-3xl text-sm leading-7 text-[rgba(245,245,242,0.72)]">
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
            Clerkfolio is operated by Clerkfolio Ltd, registered in England and Wales. For privacy requests, data subject
            rights, or questions about this policy, contact <a href="mailto:admin@clerkfolio.co.uk">admin@clerkfolio.co.uk</a>.
          </p>
          <p>
            If you are in the United Kingdom, you also have the right to complain to the Information Commissioner&apos;s
            Office. We ask that you contact us first where possible so we can try to resolve the issue.
          </p>
        </Section>

        <Section title="What we collect and why">
          <p>
            The data we collect depends on the features you use. The table below summarises the main categories currently
            reflected in the Clerkfolio app and Supabase database.
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="min-w-[760px] border-collapse text-left text-xs leading-6">
              <thead className="bg-white/[0.04] text-[rgba(245,245,242,0.7)]">
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
                    <td className="px-4 py-3 font-medium text-[#F5F5F2]">{row.category}</td>
                    <td className="px-4 py-3 text-[rgba(245,245,242,0.68)]">{row.examples}</td>
                    <td className="px-4 py-3 text-[rgba(245,245,242,0.68)]">{row.purpose}</td>
                    <td className="px-4 py-3 text-[rgba(245,245,242,0.68)]">{row.lawfulBasis}</td>
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
            If we become aware that content appears to contain patient-identifiable information, we may ask you to edit it,
            restrict the content, suspend sharing, or remove it where necessary to protect patients, comply with law, or
            protect the service.
          </p>
        </Section>

        <Section title="Where data is stored">
          <p>
            Clerkfolio stores application records and evidence files in Supabase. The project is configured for London,
            United Kingdom hosting for the core database and storage. The application is hosted on Vercel. Some providers,
            including Stripe, Resend, and Vercel, may process limited personal data outside the UK or European Economic
            Area under their own transfer safeguards and data processing terms.
          </p>
        </Section>

        <Section title="Processors and third parties">
          <p>We use the following main providers to operate Clerkfolio:</p>
          <ul>
            {processors.map(([name, description]) => (
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
            session, remember requested service state, and run the web app. The app also registers a service worker for
            web app behaviour and may temporarily store draft form data in your browser, for example an unsent case draft.
          </p>
          <p>
            Clerkfolio uses Vercel Analytics to understand aggregate product usage and performance. We do not sell or
            broker personal data. If we add non-essential cookies or similar tracking that requires consent, we will seek
            consent where required.
          </p>
        </Section>

        <Section title="Retention">
          <ul>
            <li>Live account, profile, portfolio, case, timeline, specialty, ARCP, template, and evidence records are kept while your account remains active or as needed to provide the service.</li>
            <li>Soft-deleted portfolio entries and cases remain available in trash for a limited period and are currently scheduled for purge after 30 days.</li>
            <li>Audit logs are currently scheduled for purge after one year.</li>
            <li>Share links expire no later than 90 days after creation or extension, unless revoked sooner.</li>
            <li>Student verification tokens expire after 24 hours, though related student verification status may remain on your profile.</li>
            <li>Backups and provider logs may retain limited data for a short period after deletion where necessary for security, continuity, fraud prevention, accounting, or legal compliance.</li>
          </ul>
        </Section>

        <Section title="Account deletion and export">
          <p>
            You can export your account data from Clerkfolio. The account export includes database-shaped records and
            readable JSON, and may include clean evidence files where available. You can also delete your account from the
            app. Account deletion cancels any active Clerkfolio Stripe subscription where possible, removes stored evidence
            files, and deletes the Supabase user account. Some information may remain temporarily in backups, payment
            records, provider logs, or records we must keep for legal, tax, security, or dispute purposes.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            Depending on the data and lawful basis, you may have rights to access, rectify, erase, restrict, object to
            processing, and receive a portable copy of your personal data. You may also withdraw consent where processing
            is based on consent. Some rights are not absolute, for example where we need to keep limited data for legal
            compliance, security, or dispute handling.
          </p>
          <p>
            We aim to respond to rights requests within one month. We may ask for information needed to verify your
            identity before acting on a request.
          </p>
        </Section>

        <Section title="Security">
          <p>
            Clerkfolio uses Supabase authentication, row level security, private storage paths, plan-aware upload checks,
            CSRF origin validation on sensitive routes, file type limits, malware scan status tracking, hashed PINs for
            protected share links, hashed IP addresses for share access records, and rate limiting on selected public
            endpoints. No online service can guarantee perfect security, so you should use a strong unique password and
            avoid entering sensitive information that Clerkfolio does not need.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this policy as Clerkfolio changes or legal requirements develop. Material changes will be
            reflected by updating the date above and, where appropriate, by giving in-app or email notice.
          </p>
        </Section>
      </article>
    </main>
  )
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#1B6FD9]/30 bg-[#1B6FD9]/10 px-4 py-4 text-sm leading-7 text-[rgba(245,245,242,0.82)]">
      {children}
    </div>
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
