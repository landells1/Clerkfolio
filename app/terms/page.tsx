import type { Metadata } from 'next'
import BackButton from '@/components/legal/back-button'
import LegalFooter from '@/components/legal/legal-footer'
import Link from 'next/link'
import {
  BASE_STORAGE_MB,
  VERIFIED_STORAGE_MB,
  VERIFIED_BONUS_MB,
  PRO_STORAGE_MB,
  REFERRAL_STORAGE_BONUS_MB,
  REFERRAL_STORAGE_BONUS_AT,
  formatStorageQuota,
} from '@/lib/entitlements/limits'

export const metadata: Metadata = {
  title: 'Terms of service - Clerkfolio',
  description: 'The terms governing your use of Clerkfolio, including plans, referrals, acceptable use, and liability.',
  alternates: { canonical: '/terms' },
}

const lastUpdated = '6 July 2026'

// Storage figures are computed from the entitlement constants so the Terms can
// never drift from what the app actually grants (single source: limits.ts).
const planRows = [
  ['Free', `${formatStorageQuota(BASE_STORAGE_MB)} storage. Core portfolio, cases, dashboard, timeline, ARCP tracking, settings, personal backup, one PDF export, one share link, and one active specialty tracker.`],
  ['Verified', `${formatStorageQuota(VERIFIED_STORAGE_MB)} storage for accounts verified with a .ac.uk student or NHS doctor email (the ${formatStorageQuota(BASE_STORAGE_MB)} free allowance plus a ${VERIFIED_BONUS_MB} MB verification bonus). The same feature limits as Free unless otherwise stated in the app.`],
  ['Pro', `GBP 9.99 per year (the total price payable), ${formatStorageQuota(PRO_STORAGE_MB)} storage, and unrestricted Pro features shown in the app, including additional PDF exports, share links, specialties, and bulk import where available. Pro is available only by paid subscription.`],
]

const changelog = [
  {
    date: '6 July 2026',
    changes: 'Rewrote the Refunds and cancellations section to set out the 14-day cooling-off right in full (immediate-supply request, proportionate deduction, how to cancel, model cancellation form). Clarified that the displayed price is the total price payable.',
  },
  {
    date: '28 June 2026',
    changes: 'Corrected the operator wording (sole trader, not a limited company). Updated the plan table to the current Free / Verified / Pro tiers and clarified that Pro is paid-subscription only. Added a Referrals and rewards section.',
  },
  {
    date: '26 May 2026',
    changes: 'Clarified that evidence file controls perform file type and format verification; antivirus scanning is not currently provided.',
  },
  {
    date: '15 May 2026',
    changes: 'Added VAT-inclusive pricing statement; clarified medical device / CDS disclaimer; added REVIEW markers to liability cap and refund sections; added LegalFooter and changelog.',
  },
  {
    date: '29 April 2026',
    changes: 'Initial published version.',
  },
]

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-canvas)] px-6 py-12 text-[var(--text-primary)]">
      <article className="mx-auto max-w-4xl space-y-8">
        <BackButton />
        <header className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--accent-text)]">Legal</p>
          <h1 className="text-3xl font-semibold tracking-tight">Terms of service</h1>
          <p className="text-sm text-[var(--text-secondary)]">Last updated: {lastUpdated}</p>
          <p className="max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
            These terms govern your use of Clerkfolio. By creating an account, using the app, uploading content, creating
            share links, or buying a paid plan, you agree to these terms and to the Privacy Policy.
          </p>
        </header>

        <Notice>
          Clerkfolio is a personal portfolio organisation tool. It is not a clinical record system, not a clinical
          decision support tool, not a Horus or ePortfolio replacement, not a supervisor sign-off system, and not a
          source of medical, legal, career, ARCP, or specialty application advice. It must not be used as a substitute
          for official systems, professional judgement, or regulated clinical processes.
        </Notice>

        <Section title="The service">
          <p>
            Clerkfolio helps UK medical students, foundation doctors, and doctors preparing application material organise
            their own portfolio entries, anonymised case notes, evidence files, specialty trackers, ARCP capability links,
            timeline items, exports, and share links.
          </p>
          <p>
            Clerkfolio displays and organises information that you enter. It does not verify the truth, quality, clinical
            value, scoring outcome, or professional sufficiency of your entries. Any scoring or curriculum structure shown
            in the app is for personal organisation only and may not match the requirements that apply to you at the time
            you use it.
          </p>
        </Section>

        <Section title="Eligibility and account security">
          <p>
            You must be at least 16 years old and able to enter a binding agreement under the law that applies to you. If
            you use Clerkfolio on behalf of an organisation, you confirm that you have authority to do so. You are
            responsible for keeping your login credentials secure and for all activity on your account unless caused by
            our breach of these terms.
          </p>
          <p>
            You must provide accurate account and billing information, keep it up to date, and tell us promptly if you
            suspect unauthorised account access.
          </p>
        </Section>

        <Section title="No patient-identifiable information">
          <p>
            Clerkfolio must only be used for anonymised case notes and personal portfolio material. You must not enter,
            upload, export, or share patient-identifiable information, including names, initials, dates of birth, NHS
            numbers, hospital numbers, addresses, precise rare-case narratives, images, or documents that could reasonably
            identify a patient.
          </p>
          <p>
            You remain responsible for your professional duties of confidentiality, local trust or university policies,
            GMC guidance, data protection obligations, and any requirement to obtain consent or approval before using
            information for education, training, reflection, audit, publication, or portfolio purposes.
          </p>
        </Section>

        <Section title="No advice, predictions, or formal submission">
          <ul>
            <li>Clerkfolio does not provide clinical, medical, legal, financial, tax, educational, career, or immigration advice.</li>
            <li>Clerkfolio is not a clinical decision support (CDS) tool. It does not interpret clinical information, suggest diagnoses, recommend treatments, or support clinical decision-making of any kind.</li>
            <li>Clerkfolio does not tell you whether you are competitive, on track, likely to succeed, or likely to receive a particular ARCP or application outcome.</li>
            <li>Clerkfolio does not replace Horus, NHS ePortfolio, ISCP, Royal College systems, deanery systems, university systems, or employer systems.</li>
            <li>Clerkfolio does not provide supervisor sign-off, workplace-based assessment sign-off, formal submission, verification, endorsement, or regulatory record keeping.</li>
            <li>You are responsible for checking official requirements, deadlines, person specifications, scoring rules, evidence standards, and submission instructions from the relevant authority.</li>
          </ul>
        </Section>

        <Section title="Your content">
          <p>
            You own the content you enter into Clerkfolio. You grant Clerkfolio a limited licence to host, store, process,
            display, copy, back up, scan, export, and transmit your content only as needed to provide, secure, support,
            maintain, and improve the service, comply with law, and enforce these terms.
          </p>
          <p>
            You are responsible for the accuracy, lawfulness, professional appropriateness, and confidentiality of your
            content. You must not upload unlawful, harmful, malicious, infringing, discriminatory, abusive, or security
            compromising material.
          </p>
        </Section>

        <Section title="Evidence files and upload limits">
          <p>
            Evidence uploads are intended for your own certificates, documents, and portfolio evidence. The app currently
            accepts selected document and image types and applies a per-file size limit, storage quota, and server-side
            file type and format checks. We may reject, quarantine, remove, or disable files that appear unsafe,
            unsupported, unlawful, excessive, or contrary to these terms.
          </p>
        </Section>

        <Section title="Plans, billing, and limits">
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="min-w-[640px] border-collapse text-left text-xs leading-6">
              <thead className="bg-white/[0.04] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Current summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {planRows.map(([plan, summary]) => (
                  <tr key={plan} className="align-top">
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{plan}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            The price shown is the total price you pay; if VAT becomes chargeable it will be included in the displayed
            price rather than added on top.
            Prices, allowances, and features may change, but changes will not reduce the paid term you have already bought
            without notice or a lawful basis. Subscription billing is handled by Stripe. Paid plans renew until cancelled.
            You can manage or cancel your subscription through the billing portal where available.
          </p>
          <p>
            If a paid subscription ends, your account returns to the free tier (plus any verification or referral
            storage you have earned). Downgrades may block new Pro-only actions, new uploads, exports, share links, or
            additional specialty tracking, but Clerkfolio will not delete existing user content solely because of a
            downgrade, and existing files stay readable.
          </p>
        </Section>

        <Section title="Referrals and rewards">
          <p>
            Clerkfolio may offer a referral programme and other rewards, such as additional storage, extra PDF exports or
            share links, and recognition badges. Earned storage and allowances are computed from your account&apos;s status
            (for example {`${REFERRAL_STORAGE_BONUS_MB} MB`} of additional storage once you reach {REFERRAL_STORAGE_BONUS_AT}{' '}
            rewarded referrals, plus one extra PDF export and one extra share link for each rewarded referral).
          </p>
          <p>
            Rewards have no cash value, are personal to your account, and are not transferable or exchangeable. We may
            change, limit, withdraw, or revoke any reward or the programme itself at any time, including where we
            reasonably believe it is being abused, gamed, or used through fake, duplicate, or inactive accounts. Rewards
            are granted only once the qualifying conditions shown in the app are met.
          </p>
        </Section>

        <Section title="Refunds and cancellations">
          <p>
            <strong>Your 14-day right to cancel.</strong> If you are a consumer, you have the right to cancel a new
            subscription within 14 days of the day after you buy it, without giving a reason, under the Consumer
            Contracts (Information, Cancellation and Additional Charges) Regulations 2013. By subscribing, you
            expressly request that we start providing the Pro service immediately, during the cancellation period.
            If you then cancel within the 14 days, we will refund what you paid minus a proportionate amount for the
            time the service was supplied before you told us you were cancelling.
          </p>
          <p>
            <strong>How to cancel.</strong> You can cancel by emailing{' '}
            <a href="mailto:admin@clerkfolio.co.uk">admin@clerkfolio.co.uk</a> with any clear statement that you want
            to cancel, or by using the model form below (its use is not obligatory). To cancel future renewal at any
            time (inside or outside the 14 days), you can also use the Stripe billing portal in Settings. Refunds are
            made within 14 days of cancellation using the original payment method.
          </p>
          <p>
            <strong>After the 14 days.</strong> You can stop your plan renewing at any time and keep Pro until the end
            of the period you paid for. Fees for a period already supplied are not otherwise refundable, except where
            the law gives you a right to a refund (for example where the service is faulty under the Consumer Rights
            Act 2015).
          </p>
          <p className="rounded-lg border border-white/[0.08] px-4 py-3 text-xs leading-6">
            <strong>Model cancellation form.</strong> To Clerkfolio ({' '}
            <a href="mailto:admin@clerkfolio.co.uk">admin@clerkfolio.co.uk</a>): I hereby give notice that I cancel my
            contract for the supply of the Clerkfolio Pro subscription, ordered on [date], name of consumer, email
            address used for the account, date.
          </p>
        </Section>

        <Section title="Sharing, exports, and public links">
          <p>
            You may export your data and create scoped public portfolio share links where your plan allows. You are
            responsible for choosing what to share, who receives a link, whether to use a PIN, when to revoke a link, and
            whether the content is suitable for disclosure. Anyone with a valid link and any required PIN may access the
            shared content until expiry, revocation, or automatic suspension.
          </p>
          <p>
            You must not use Clerkfolio share links or exports to disclose patient-identifiable information, confidential
            third-party information, or material you do not have permission to share.
          </p>
        </Section>

        <Section title="Acceptable use">
          <ul>
            <li>Do not attempt to bypass plan limits, security controls, rate limits, storage quotas, authentication, row level security, or access controls.</li>
            <li>Do not probe, scan, scrape, overload, reverse engineer, or interfere with Clerkfolio except where permitted by law and responsibly disclosed under our <Link href="/security" className="underline hover:text-[var(--text-primary)]">Security policy</Link>.</li>
            <li>Do not use Clerkfolio to store malware, regulated clinical records, patient-identifiable information, illegal material, or content that infringes another person&apos;s rights.</li>
            <li>Do not misrepresent Clerkfolio outputs as verified, formally approved, supervisor-signed, or submitted to any training body.</li>
            <li>Do not create accounts or share links for abusive, fraudulent, spam, or unauthorised commercial purposes.</li>
          </ul>
        </Section>

        <Section title="Suspension and termination">
          <p>
            You may stop using Clerkfolio at any time and may delete your account through the app where available. We may
            suspend or terminate access, remove content, disable share links, or refuse service if we reasonably believe
            you have breached these terms, created risk for patients or other users, infringed rights, failed to pay fees,
            threatened the security of the service, or used the service unlawfully. Where practical, we will give advance
            notice; where we cannot, we will explain our decision as soon as reasonably possible.
          </p>
        </Section>

        <Section title="Third-party services">
          <p>
            Clerkfolio relies on third-party services including Supabase, Vercel, Stripe, Resend, and Upstash. Their
            systems and terms may apply to parts of the service they provide. We are not responsible for third-party
            outages, policy changes, or failures outside our reasonable control, but we will use reasonable care in
            selecting and operating providers. See our{' '}
            <Link href="/subprocessors" className="underline hover:text-[var(--text-primary)]">Subprocessors page</Link> for details.
          </p>
        </Section>

        <Section title="Availability and changes">
          <p>
            We aim to provide a reliable service, but Clerkfolio is provided on an as available basis. We may update,
            suspend, withdraw, limit, or change features for maintenance, security, legal, operational, or product reasons.
            We may also correct or remove content, templates, specialty structures, or deadline information where we
            believe it is inaccurate, outdated, unsafe, or contrary to these terms.
          </p>
        </Section>

        <Section title="Disclaimers">
          <p>
            To the fullest extent permitted by law, Clerkfolio does not guarantee that the service, exports, specialty
            structures, deadline information, scoring fields, templates, importance ratings, or ARCP capability links
            are complete, accurate, current, accepted by any body, or suitable for your particular purpose. You should
            verify all official requirements independently.
          </p>
        </Section>

        <Section title="Liability">
          <p>
            Nothing in these terms limits liability that cannot legally be limited, including liability for death or
            personal injury caused by negligence, fraud, fraudulent misrepresentation, or rights you have under consumer
            law. Subject to that, Clerkfolio is not liable for indirect or consequential loss, loss of opportunity,
            application outcome, ARCP outcome, reputation, goodwill, anticipated savings, or loss caused by your decision
            to enter or share confidential or patient-identifiable information.
          </p>
          <p>
            Where the law allows a financial cap, Clerkfolio&apos;s total liability arising out of or relating to the service
            is limited to the greater of the amount you paid to Clerkfolio in the 12 months before the event giving rise
            to the claim or GBP 100.
          </p>
        </Section>

        <Section title="Indemnity">
          <p>
            If your use of Clerkfolio breaches these terms, infringes another person&apos;s rights, or results in a claim
            because you entered, uploaded, exported, or shared patient-identifiable, confidential, unlawful, or unauthorised
            material, you agree to reimburse Clerkfolio for reasonable losses, costs, damages, and expenses caused by that
            breach, to the extent permitted by law.
          </p>
        </Section>

        <Section title="Governing law">
          <p>
            These terms are governed by the laws of England and Wales. The courts of England and Wales will have exclusive
            jurisdiction, except that consumers may also have rights to bring claims in the courts of the part of the UK
            where they live where applicable under mandatory consumer protection law.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these terms, privacy, account access, or data requests should be sent to{' '}
            <a href="mailto:admin@clerkfolio.co.uk">admin@clerkfolio.co.uk</a>.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We may update these terms as Clerkfolio changes or legal requirements develop. We will give notice of material
            changes by updating the date above and, where appropriate, by in-app or email notice.
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
