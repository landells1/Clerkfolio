const lastUpdated = '29 April 2026'

const planRows = [
  ['Free', '100 MB storage. Core portfolio, cases, dashboard, timeline, ARCP tracking, settings, personal backup, one PDF export, one share link, and one active specialty tracker.'],
  ['Student', '1 GB storage for verified .ac.uk student users. The same feature limits as Free unless otherwise stated in the app.'],
  ['Foundation', '100 MB storage and the standard free feature allowance unless upgraded or covered by referral Pro.'],
  ['Pro', 'GBP 10 per year, 5 GB storage, and unrestricted Pro features shown in the app, including additional PDF exports, share links, specialties, and bulk import where available.'],
]

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0C] px-6 py-12 text-[#F5F5F2]">
      <article className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#1B6FD9]">Legal</p>
          <h1 className="text-3xl font-semibold tracking-tight">Terms of service</h1>
          <p className="text-sm text-[rgba(245,245,242,0.55)]">Last updated: {lastUpdated}</p>
          <p className="max-w-3xl text-sm leading-7 text-[rgba(245,245,242,0.72)]">
            These terms govern your use of Clerkfolio. By creating an account, using the app, uploading content, creating
            share links, or buying a paid plan, you agree to these terms and to the Privacy Policy.
          </p>
        </header>

        <Notice>
          Clerkfolio is a personal portfolio organisation tool. It is not a clinical record system, not a Horus or
          ePortfolio replacement, not a supervisor sign-off system, and not a source of medical, legal, career, ARCP, or
          specialty application advice.
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
            accepts selected document and image types and applies a per-file size limit, storage quota, MIME type checks,
            and malware scan status tracking. We may reject, quarantine, remove, or disable files that appear unsafe,
            unsupported, unlawful, excessive, or contrary to these terms.
          </p>
        </Section>

        <Section title="Plans, billing, and limits">
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="min-w-[640px] border-collapse text-left text-xs leading-6">
              <thead className="bg-white/[0.04] text-[rgba(245,245,242,0.7)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Current summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {planRows.map(([plan, summary]) => (
                  <tr key={plan} className="align-top">
                    <td className="px-4 py-3 font-medium text-[#F5F5F2]">{plan}</td>
                    <td className="px-4 py-3 text-[rgba(245,245,242,0.68)]">{summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Prices, allowances, and features may change, but changes will not reduce the paid term you have already bought
            without notice or a lawful basis. Subscription billing is handled by Stripe. Paid plans renew until cancelled.
            You can manage or cancel your subscription through the billing portal where available.
          </p>
          <p>
            If a paid subscription ends, your account may move to a free or foundation tier. Downgrades may block new
            Pro-only actions, new uploads, exports, share links, or additional specialty tracking, but Clerkfolio will not
            delete existing user content solely because of a downgrade.
          </p>
        </Section>

        <Section title="Refunds and cancellations">
          <p>
            You can cancel future renewal of a paid plan through the Stripe billing portal where available or by contacting
            us. Unless the law gives you a right to cancel or receive a refund, fees already paid are not automatically
            refundable. Where consumer cancellation rights apply, they may be affected once you ask us to start providing
            digital services during the cancellation period.
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
            <li>Do not probe, scan, scrape, overload, reverse engineer, or interfere with Clerkfolio except where permitted by law and responsibly disclosed.</li>
            <li>Do not use Clerkfolio to store malware, regulated clinical records, patient-identifiable information, illegal material, or content that infringes another person&apos;s rights.</li>
            <li>Do not misrepresent Clerkfolio outputs as verified, formally approved, supervisor-signed, or submitted to any training body.</li>
            <li>Do not create accounts or share links for abusive, fraudulent, spam, or unauthorised commercial purposes.</li>
          </ul>
        </Section>

        <Section title="Third-party services">
          <p>
            Clerkfolio relies on third-party services including Supabase, Vercel, Stripe, and Resend. Their systems and
            terms may apply to parts of the service they provide. We are not responsible for third-party outages, policy
            changes, or failures outside our reasonable control, but we will use reasonable care in selecting and operating
            providers.
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

        <Section title="Suspension and termination">
          <p>
            You may stop using Clerkfolio at any time and may delete your account through the app where available. We may
            suspend or terminate access, remove content, disable share links, or refuse service if we reasonably believe
            you have breached these terms, created risk for patients or other users, infringed rights, failed to pay fees,
            threatened the security of the service, or used the service unlawfully.
          </p>
        </Section>

        <Section title="Disclaimers">
          <p>
            To the fullest extent permitted by law, Clerkfolio does not guarantee that the service, exports, specialty
            structures, deadline information, scoring fields, templates, completeness indicators, or ARCP capability links
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
            These terms are governed by the laws of England and Wales. The courts of England and Wales will have
            jurisdiction, except that consumers may also have rights to bring claims in the courts of the part of the UK
            where they live where applicable.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these terms, privacy, account access, or data requests should be sent to{' '}
            <a href="mailto:admin@clerkfolio.co.uk">admin@clerkfolio.co.uk</a>.
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
