import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Clinidex',
  description: 'How Clinidex collects, uses and protects your personal data.',
}

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" updated="22 April 2026" sections={sections} />
}

// ─── Shared layout ────────────────────────────────────────────────────────────

function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: Section[] }) {
  return (
    <div style={{ background: '#0B0B0C', color: '#F5F5F2', minHeight: '100vh', fontFamily: '"Inter", -apple-system, system-ui, sans-serif' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 56px', borderBottom: '1px solid rgba(245,245,242,0.08)', background: 'rgba(11,11,12,0.9)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', color: '#F5F5F2' }}>
          <div style={{ width: 24, height: 24, borderRadius: 5, background: 'linear-gradient(135deg, #3884DD 0%, #155BB0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 64 64" fill="none">
              <rect x="8" y="36" width="9" height="20" rx="1.6" fill="rgba(255,255,255,0.5)" />
              <rect x="20" y="30" width="9" height="26" rx="1.6" fill="rgba(255,255,255,0.65)" />
              <rect x="32" y="24" width="9" height="32" rx="1.6" fill="rgba(255,255,255,0.8)" />
              <rect x="44" y="16" width="11" height="40" rx="2" fill="white" />
              <path d="M47 36 L50.5 39.5 L55 30" stroke="#1B6FD9" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 500 }}>Clinidex</span>
        </Link>
        <Link href="/" style={{ fontSize: 13, color: 'rgba(245,245,242,0.55)', textDecoration: 'none' }}>← Back to home</Link>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '80px 24px 120px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(245,245,242,0.35)', letterSpacing: 1.5, marginBottom: 16 }}>LEGAL DOCUMENT</div>
        <h1 style={{ fontSize: 48, fontWeight: 500, letterSpacing: -1.5, margin: 0, marginBottom: 12 }}>{title}</h1>
        <p style={{ fontSize: 14, color: 'rgba(245,245,242,0.35)', fontFamily: 'monospace', marginBottom: 64 }}>Last updated: {updated}</p>

        {sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 52 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#1B6FD9', letterSpacing: 1 }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ width: 24, height: 1, background: 'rgba(245,245,242,0.08)' }} />
              <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0, letterSpacing: -0.3 }}>{s.heading}</h2>
            </div>
            <div style={{ paddingLeft: 0 }}>
              {s.body.map((para, j) => (
                <p key={j} style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(245,245,242,0.75)', marginBottom: 16, marginTop: 0 }}
                   dangerouslySetInnerHTML={{ __html: para }} />
              ))}
              {s.list && (
                <ul style={{ paddingLeft: 20, margin: '0 0 16px' }}>
                  {s.list.map((item, j) => (
                    <li key={j} style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(245,245,242,0.75)', marginBottom: 8 }}
                        dangerouslySetInnerHTML={{ __html: item }} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}

        <div style={{ marginTop: 64, paddingTop: 32, borderTop: '1px solid rgba(245,245,242,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'monospace', fontSize: 11, color: 'rgba(245,245,242,0.35)', letterSpacing: 1 }}>
          <span>CLINIDEX · § 2026</span>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>PRIVACY</Link>
            <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>TERMS</Link>
            <a href="mailto:hello@clinidex.co.uk" style={{ color: 'inherit', textDecoration: 'none' }}>CONTACT</a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Section {
  heading: string
  body: string[]
  list?: string[]
}

// ─── Privacy Policy content ───────────────────────────────────────────────────

const sections: Section[] = [
  {
    heading: 'Who we are',
    body: [
      'Clinidex ("we", "us", "our") is a portfolio management platform for UK medical students and doctors. We are the data controller responsible for your personal data.',
      'We can be contacted at: <strong>hello@clinidex.co.uk</strong>',
      'We are registered with the Information Commissioner\'s Office (ICO) as required under UK data protection law.',
    ],
  },
  {
    heading: 'What data we collect and why',
    body: [
      'We collect personal data only where it is necessary to provide the Clinidex service. The categories of data we collect, and our legal basis for doing so under UK GDPR, are as follows:',
    ],
    list: [
      '<strong>Account data</strong> — your name, email address, career stage, and specialties of interest. Legal basis: performance of a contract (to create and maintain your account).',
      '<strong>Portfolio entries</strong> — cases, procedures, reflections, achievements, audits, publications, teaching records, and deadlines that you create within the platform. Legal basis: performance of a contract (to provide the core service).',
      '<strong>Evidence files</strong> — documents, images, and PDFs that you upload as supporting evidence for portfolio entries. Legal basis: performance of a contract.',
      '<strong>Payment data</strong> — billing history and subscription status. Card details are processed directly by Stripe and are never stored on our systems. Legal basis: performance of a contract and compliance with legal obligations (financial record-keeping).',
      '<strong>Technical data</strong> — your IP address, browser type, and session information, collected automatically to maintain security and prevent fraud. Legal basis: legitimate interests.',
      '<strong>Communications</strong> — messages you send us via the in-app feedback form or by email. Legal basis: legitimate interests (to respond to your enquiries and improve the service).',
    ],
  },
  {
    heading: 'A note on clinical information',
    body: [
      'Clinidex is a professional portfolio tool, not a clinical records system. You must not record patient-identifiable information — including patient names, dates of birth, NHS numbers, or any other information that could identify a patient — within the platform.',
      'Portfolio entries should describe your professional activities, skills and learning points in anonymised form, consistent with GMC guidance on maintaining patient confidentiality.',
      'Where you inadvertently record information that relates to identifiable patients, you, as the data controller for that patient information, are responsible for ensuring compliance with your own data protection obligations. We strongly recommend you delete any such entries immediately.',
    ],
  },
  {
    heading: 'How we use your data',
    body: [
      'We use your data to:',
    ],
    list: [
      'Create and maintain your account',
      'Provide the portfolio tracking, export, and sharing features',
      'Process subscription payments and manage billing',
      'Send transactional emails (account confirmation, password reset, billing receipts)',
      'Maintain the security and integrity of the platform',
      'Respond to feedback and support enquiries',
      'Improve the service based on anonymised usage patterns',
    ],
  },
  {
    heading: 'Who we share your data with',
    body: [
      'We do not sell your personal data. We share data only with the following third-party processors, each bound by data processing agreements:',
    ],
    list: [
      '<strong>Supabase Inc</strong> (United Kingdom) — database hosting and file storage. Data is stored in the EU West 2 region (AWS London). Data is encrypted at rest (AES-256) and in transit (TLS). Data does not leave the United Kingdom.',
      '<strong>Stripe Inc</strong> (United States) — payment processing. Stripe processes payment card data under its own PCI DSS certification. UK–US Data Bridge applies.',
      '<strong>Resend Inc</strong> (United States) — transactional email delivery (account confirmation, password reset). UK–US Data Bridge applies.',
      '<strong>Vercel Inc</strong> (United States) — application hosting and edge delivery. UK–US Data Bridge applies.',
      'We may also disclose data where required by law, court order, or to protect the rights and safety of users or third parties.',
    ],
  },
  {
    heading: 'International data transfers',
    body: [
      'Some of our third-party processors operate outside the United Kingdom. Where data is transferred to countries not deemed adequate by the UK Government, we rely on the UK–US Data Bridge (where applicable) or the UK International Data Transfer Agreement (UK IDTA), which provides safeguards equivalent to those under UK GDPR. Your database and file storage data is hosted by Supabase in the EU West 2 region (AWS London) and does not leave the United Kingdom.',
      'You may request details of the specific safeguards in place for any transfer by contacting us at hello@clinidex.co.uk.',
    ],
  },
  {
    heading: 'How long we keep your data',
    body: [
      'We retain your data for as long as your account is active. When you delete your account:',
    ],
    list: [
      'Your profile and portfolio data are deleted within 30 days.',
      'Evidence files stored in our file storage are deleted within 30 days.',
      'Backup copies are purged within 90 days.',
      'Billing records are retained for 7 years as required by UK financial regulations.',
      'Anonymised, aggregated analytics data (which cannot identify you) may be retained indefinitely.',
    ],
  },
  {
    heading: 'Cookies',
    body: [
      'Clinidex uses the following cookies:',
    ],
    list: [
      '<strong>Authentication cookies</strong> — session tokens set by Supabase to keep you logged in. These are strictly necessary and cannot be disabled.',
      '<strong>Analytics</strong> — we use Vercel Analytics, which collects anonymised, aggregated data about page visits (no personal identifiers, no cross-site tracking, no advertising cookies).',
    ],
  },
  {
    heading: 'Your rights',
    body: [
      'Under UK GDPR, you have the following rights in relation to your personal data:',
    ],
    list: [
      '<strong>Right of access</strong> — to obtain a copy of the personal data we hold about you.',
      '<strong>Right to rectification</strong> — to correct inaccurate or incomplete data.',
      '<strong>Right to erasure</strong> — to request deletion of your personal data (subject to legal retention obligations).',
      '<strong>Right to data portability</strong> — to receive your data in a structured, machine-readable format. Clinidex supports PDF and data export directly from your account.',
      '<strong>Right to restrict processing</strong> — to ask us to limit how we use your data in certain circumstances.',
      '<strong>Right to object</strong> — to object to processing based on legitimate interests.',
      '<strong>Right to withdraw consent</strong> — where processing is based on consent, to withdraw it at any time without affecting the lawfulness of prior processing.',
    ],
  },
  {
    heading: 'Exercising your rights and complaints',
    body: [
      'To exercise any of your rights, please contact us at <strong>hello@clinidex.co.uk</strong>. We will respond within one calendar month.',
      'You also have the right to lodge a complaint with the Information Commissioner\'s Office (ICO), the UK\'s data protection supervisory authority:',
      '<strong>ICO website:</strong> <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" style="color: #1B6FD9">ico.org.uk</a> &nbsp;|&nbsp; <strong>Helpline:</strong> 0303 123 1113',
    ],
  },
  {
    heading: 'Security',
    body: [
      'We take appropriate technical and organisational measures to protect your personal data against unauthorised access, loss, or disclosure. These include:',
    ],
    list: [
      'AES-256 encryption of data at rest',
      'TLS encryption of all data in transit',
      'Row-level security on all database tables, ensuring each user can only access their own data',
      'Strict access controls on production systems',
      'Regular security reviews',
    ],
  },
  {
    heading: 'Changes to this policy',
    body: [
      'We may update this Privacy Policy from time to time. Where changes are material, we will notify you by email to the address associated with your account at least 14 days before the change takes effect.',
      'The "Last updated" date at the top of this page reflects the date of the most recent revision. Continued use of Clinidex after the effective date of any change constitutes acceptance of the updated policy.',
    ],
  },
  {
    heading: 'Contact',
    body: [
      'For any questions about this Privacy Policy or how we handle your personal data, please contact us at <strong>hello@clinidex.co.uk</strong>.',
    ],
  },
]
