'use client'

import BackButton from '@/components/legal/back-button'
import LegalFooter from '@/components/legal/legal-footer'
import Link from 'next/link'
import { LEGAL_ENTITY } from '@/lib/legal/entity'

const lastUpdated = '28 June 2026'

export default function DpaPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-canvas)] px-6 py-12 text-[var(--text-primary)]">
      <article className="mx-auto max-w-4xl space-y-8">
        <BackButton />
        <header className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--accent-text)]">Legal</p>
          <h1 className="text-3xl font-semibold tracking-tight">Data processing agreement</h1>
          <p className="text-sm text-[var(--text-secondary)]">Last updated: {lastUpdated}</p>
        </header>

        {/* ── Lite DPA Summary ── */}
        <div className="rounded-xl border border-[#1B6FD9]/30 bg-[#1B6FD9]/10 px-5 py-5 text-sm leading-7 text-[var(--text-primary)]">
          <p className="font-semibold text-[var(--text-primary)] mb-2">Summary (non-binding)</p>
          <ul className="space-y-1.5 text-xs leading-6">
            <li>Clerkfolio acts as a <strong>data processor</strong> when processing personal data on behalf of an institutional customer (the controller). For individual consumer sign-ups, Clerkfolio is itself the data controller - see the <Link href="/privacy" className="underline">Privacy policy</Link>.</li>
            <li>Data is stored in Supabase eu-west-2 (London, UK). Subprocessors are listed at <Link href="/subprocessors" className="underline">/subprocessors</Link>. US subprocessors (Resend, Vercel) participate in the UK International Data Transfer Agreement or the EU-US Data Privacy Framework.</li>
            <li>Clerkfolio will process personal data only on documented instructions from the controller, maintain appropriate technical and organisational security measures, and assist with data subject rights requests.</li>
            <li>Security incidents affecting personal data will be notified to the controller without undue delay and within 72 hours of becoming aware.</li>
            <li>On termination, personal data will be returned or deleted at the controller&apos;s request within 30 days, unless retention is required by law.</li>
          </ul>
          <p className="mt-3 text-xs text-[var(--text-secondary)]">
            This summary is for convenience only. The full agreement below governs. For enterprise DPA requests, contact{' '}
            <a href="mailto:admin@clerkfolio.co.uk" className="underline">admin@clerkfolio.co.uk</a>.
          </p>
        </div>

        {/* ── Download ── */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => typeof window !== 'undefined' && window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-white/[0.16] hover:text-[var(--text-primary)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Save / print as PDF
          </button>
        </div>

        <Section title="1. Parties">
          <p>
            This Data Processing Agreement (&ldquo;DPA&rdquo;) is entered into between:
          </p>
          <ul>
            <li>
              <strong>Data Controller:</strong> the organisation or individual named in the Clerkfolio
              account or service agreement (&ldquo;Controller&rdquo; or &ldquo;Customer&rdquo;); and
            </li>
            <li>
              <strong>Data Processor:</strong> Clerkfolio, an independent service operated by an individual
              (a sole trader) based in the United Kingdom; it is not a limited company
              {LEGAL_ENTITY.proprietorName ? ` (provided by ${LEGAL_ENTITY.proprietorName})` : ''}
              {' '}(&ldquo;Processor&rdquo; or &ldquo;Clerkfolio&rdquo;). Data protection queries and an address for
              service can be obtained from{' '}
              <a href={`mailto:${LEGAL_ENTITY.contactEmail}`} className="underline">{LEGAL_ENTITY.contactEmail}</a>.
            </li>
          </ul>
          <p>
            This DPA forms part of the Terms of Service between the parties. Where there is a conflict
            between this DPA and the Terms of Service on data protection matters, this DPA prevails.
          </p>
        </Section>

        <Section title="2. Subject matter, duration, nature, and purpose">
          <p>
            Clerkfolio provides a web application that allows medical students, foundation doctors, and
            other healthcare trainees to organise, store, and export their personal portfolio records,
            anonymised case notes, evidence files, specialty trackers, and related training material.
          </p>
          <p>
            The processing is carried out for the duration of the agreement between the parties and
            for such further period as is reasonably necessary to comply with legal obligations or
            to complete the return or deletion of data as described in section 12.
          </p>
          <p>
            The nature of the processing includes: collection, storage, retrieval, display, export,
            backup, transmission, and deletion of personal data via the Clerkfolio platform.
          </p>
        </Section>

        <Section title="3. Data subject categories">
          <p>The data subjects are:</p>
          <ul>
            <li>Medical students, foundation doctors, specialty trainees, and other healthcare professionals who use Clerkfolio as end users; and</li>
            <li>Where applicable, supervisors, verifiers, or other individuals whose details are entered by users in connection with their portfolio (e.g. name of a supervisor referenced in an entry).</li>
          </ul>
        </Section>

        <Section title="4. Personal data categories">
          <p>The personal data processed may include:</p>
          <ul>
            <li>Identity and contact data: name, email address (including .ac.uk or NHS institutional addresses), career stage.</li>
            <li>Account and authentication data: hashed passwords, session tokens, subscription tier, onboarding status.</li>
            <li>Portfolio content: entries, notes, reflections, case titles, clinical areas, specialty tags, competency themes, dates, and evidence file metadata.</li>
            <li>
              Special category data (Article 9 UK GDPR): anonymised case diary entries may incidentally
              contain information relating to the health of third parties (patients). Clerkfolio is
              designed for anonymised records only; users must not enter patient-identifiable data. To
              the extent that health-related information is processed, the lawful basis under Article
              9(2)(a) UK GDPR is the explicit consent of the data subject (the Clerkfolio user) given
              at account registration and confirmed by the Terms of Service.
              {/* Art 9(2)(a) explicit consent at sign-up confirmed by operator as the correct basis. Art 9(2)(j) (scientific/research) not applicable - Clerkfolio is personal organisation, not research processing. */}
            </li>
            <li>Payment data: Stripe customer ID, subscription status. Card data is processed by Stripe directly and is not stored by Clerkfolio.</li>
            <li>Technical data: IP address hashes, session fingerprints, browser/device metadata.</li>
          </ul>
        </Section>

        <Section title="5. Controller obligations">
          <p>The Controller shall:</p>
          <ul>
            <li>Ensure it has a lawful basis under UK GDPR for instructing Clerkfolio to process personal data.</li>
            <li>Provide data subjects with any required notice of the processing, including reference to Clerkfolio as a processor.</li>
            <li>Comply with applicable data protection law in relation to its instructions to Clerkfolio.</li>
            <li>Notify Clerkfolio promptly of any changes to instructions or applicable requirements.</li>
            <li>Ensure that users of the platform (where the Controller manages accounts) are notified of and comply with the prohibition on entering patient-identifiable data.</li>
          </ul>
          {/* Enterprise-specific obligations may be added here in bilateral signed DPAs. */}
        </Section>

        <Section title="6. Processor obligations">
          <p>Clerkfolio shall:</p>
          <ul>
            <li>Process personal data only on documented instructions from the Controller, unless required to do so by law, in which case Clerkfolio shall inform the Controller of that legal requirement beforehand unless prohibited from doing so.</li>
            <li>Ensure that persons authorised to process personal data are subject to a duty of confidentiality.</li>
            <li>Implement the technical and organisational security measures described in section 9 and at <Link href="/security" className="underline">clerkfolio.co.uk/security</Link>.</li>
            <li>Assist the Controller with its obligations in respect of data subject rights requests, data protection impact assessments, and prior consultation where required.</li>
            <li>Make available to the Controller all information necessary to demonstrate compliance with this DPA, subject to any confidentiality obligations and upon reasonable notice.</li>
            <li>Promptly inform the Controller if, in Clerkfolio&apos;s opinion, any instruction infringes applicable data protection law.</li>
          </ul>
        </Section>

        <Section title="7. Subprocessors">
          <p>
            The Controller grants general written authorisation for Clerkfolio to engage the subprocessors
            listed at{' '}
            <Link href="/subprocessors" className="underline">
              clerkfolio.co.uk/subprocessors
            </Link>
            , as updated from time to time.
          </p>
          <p>
            Clerkfolio will notify the Controller of any intended changes to subprocessors by email
            to the account contact address at least 30 days before the change takes effect. The Controller
            may object to any new subprocessor by contacting{' '}
            <a href="mailto:admin@clerkfolio.co.uk">admin@clerkfolio.co.uk</a> within that notice
            period. If the parties cannot resolve a reasonable objection, the Controller may terminate
            the agreement on written notice.
          </p>
          <p>
            Clerkfolio imposes data protection obligations on each subprocessor equivalent to those in
            this DPA and remains liable to the Controller for any failure by a subprocessor to meet
            those obligations.
          </p>
          {/* 30-day notice period confirmed as operationally achievable by operator. */}
        </Section>

        <Section title="8. International transfers">
          <p>
            Core application data and evidence files are stored in Supabase eu-west-2 (London, UK).
            Some subprocessors are based in or transfer data to the United States:
          </p>
          <ul>
            <li>
              <strong>Resend</strong> (email delivery): participates in the EU-US Data Privacy Framework
              and has executed a UK International Data Transfer Agreement (IDTA) or Standard Contractual
              Clauses (SCCs) as applicable.
            </li>
            <li>
              <strong>Vercel</strong> (hosting infrastructure): participates in the EU-US Data Privacy
              Framework. Production deployments are served from the London region (lhr1). Limited
              personal data (e.g. request logs) may be processed in the US.
            </li>
          </ul>
          <p>
            Transfers to the United States rely on adequacy decisions, the UK IDTA, SCCs, or the
            Data Privacy Framework as applicable to each processor. See the{' '}
            <Link href="/subprocessors" className="underline">subprocessors page</Link> for links to
            each provider&apos;s transfer safeguards.
          </p>
          {/* DPF status as of May 2026: in force. Clerkfolio's risk is low - clinical portfolio content stays in Supabase eu-west-2 (London); only email address/name (Resend) and request-routing metadata (Vercel lhr1) touch US infrastructure. Monitor noyb.eu for DPF challenge outcomes; fallback is UK IDTA already in place with both processors. */}
        </Section>

        <Section title="9. Security measures">
          <p>
            Clerkfolio implements the following technical and organisational security measures, described
            in detail at{' '}
            <Link href="/security" className="underline">clerkfolio.co.uk/security</Link>:
          </p>
          <ul>
            <li>Encryption at rest (Supabase eu-west-2 managed encryption) and in transit (HTTPS/TLS).</li>
            <li>Row-level security (RLS) on all database tables - users can only access their own data.</li>
            <li>Authentication via Supabase Auth with PKCE; session management with expiry and revocation.</li>
            <li>Hashed PINs for share links; hashed IP addresses for share access audit logs.</li>
            <li>Rate limiting on public endpoints via Upstash Redis.</li>
            <li>CSRF origin validation on state-changing API routes.</li>
            <li>Server-side file type and file-format validation for evidence uploads; antivirus scanning is not currently provided.</li>
            <li>User-initiated account deletion removes personal data (including evidence files, portfolio entries, cases, and associated records) from live systems promptly; backup copies are purged within 30 days in the normal backup rotation, and billing or other records that must be retained by law are kept only for the period legally required. See section 12 and the <Link href="/privacy" className="underline">Privacy policy</Link> retention section.</li>
            <li>Security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).</li>
          </ul>
          {/* Security measures confirmed proportionate by operator. No patient identifiable data is stored; all content is anonymised personal reflections and portfolio records. Penetration test schedule to be determined post-launch. */}
        </Section>

        <Section title="10. Audit rights">
          <p>
            Clerkfolio shall, upon reasonable written request and at the Controller&apos;s cost, provide
            the Controller with all information necessary to demonstrate compliance with the obligations
            set out in this DPA. Where the Controller wishes to conduct an audit or inspection, the
            parties shall agree the scope, timing, and confidentiality obligations in advance. Clerkfolio
            may satisfy audit requests by providing third-party audit reports or certifications where
            available.
          </p>
          {/* Audit frequency and confidentiality obligations to be agreed in bilateral enterprise DPAs as needed. */}
        </Section>

        <Section title="11. Personal data breach notification">
          <p>
            Clerkfolio shall notify the Controller without undue delay and, where feasible, within
            72 hours of becoming aware of a personal data breach affecting the Controller&apos;s data.
            The notification will include, to the extent available at the time:
          </p>
          <ul>
            <li>A description of the nature of the breach, including the categories and approximate number of data subjects and records affected.</li>
            <li>The name and contact details of the data protection contact at Clerkfolio.</li>
            <li>A description of the likely consequences of the breach.</li>
            <li>A description of the measures taken or proposed to address the breach.</li>
          </ul>
          <p>
            Notification should be sent to the contact address on the Controller&apos;s account. The Controller
            remains responsible for notifying the ICO and affected data subjects as required by applicable
            law.
          </p>
        </Section>

        <Section title="12. Return and deletion of data">
          <p>
            Upon termination of the agreement, or on written request, Clerkfolio shall at the
            Controller&apos;s choice:
          </p>
          <ul>
            <li>Return personal data to the Controller in a machine-readable format within 30 days; or</li>
            <li>Securely delete all personal data and confirm deletion in writing within 30 days,</li>
          </ul>
          <p>
            unless Clerkfolio is required by applicable law to retain some or all of the personal data.
            In that case, Clerkfolio shall inform the Controller of the legal requirement and the
            categories of data retained. Backups may take up to a further 30 days to purge.
          </p>
          {/* 30-day deletion timescales confirmed as operationally achievable. Backup retention exception (further 30 days) is already stated in the text above. */}
        </Section>

        <Section title="13. Governing law">
          <p>
            This DPA is governed by the laws of England and Wales. Disputes shall be subject to
            the exclusive jurisdiction of the courts of England and Wales, unless the parties
            agree otherwise in writing.
          </p>
        </Section>

        <Section title="14. Contact">
          <p>
            Data protection and DPA queries should be directed to{' '}
            <a href="mailto:admin@clerkfolio.co.uk">admin@clerkfolio.co.uk</a>. For enterprise DPA
            negotiations, please contact the same address to arrange a signed bilateral agreement.
          </p>
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
