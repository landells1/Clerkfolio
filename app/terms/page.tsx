import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms & Conditions — Clinidex',
  description: 'Terms and conditions for use of the Clinidex platform.',
}

export default function TermsPage() {
  return <LegalPage title="Terms & Conditions" updated="22 April 2026" sections={sections} />
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
            <div>
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

// ─── Terms content ────────────────────────────────────────────────────────────

const sections: Section[] = [
  {
    heading: 'Introduction and acceptance',
    body: [
      'These Terms & Conditions ("Terms") govern your access to and use of the Clinidex platform ("Service"), operated by Clinidex ("we", "us", "our").',
      'By creating an account or using the Service, you confirm that you have read, understood, and agree to be bound by these Terms and our <a href="/privacy" style="color: oklch(0.82 0.13 195)">Privacy Policy</a>. If you do not agree, you must not use the Service.',
      'These Terms constitute a legally binding agreement between you and Clinidex under the laws of England and Wales.',
    ],
  },
  {
    heading: 'The Service',
    body: [
      'Clinidex is a professional portfolio management platform designed for medical students and doctors practising in the United Kingdom. The Service allows you to:',
    ],
    list: [
      'Record and organise professional portfolio activities, including cases, procedures, reflections, achievements, audits, publications, and teaching',
      'Upload supporting evidence documents',
      'Track deadlines and specialty-specific application checklists',
      'Export selected portfolio content as PDFs or share curated views via secure links',
      'Monitor portfolio activity and coverage across clinical domains',
    ],
  },
  {
    heading: 'Important limitations — what Clinidex is not',
    body: [
      '<strong>Clinidex is not a clinical records system.</strong> It is a professional development and portfolio tool. It must not be used to store identifiable patient data, clinical notes, or any other information that constitutes a health record.',
      '<strong>Clinidex is not affiliated with the NHS, GMC, UKFPO, royal medical colleges, or any postgraduate deanery.</strong> Portfolio entries created in Clinidex do not constitute official records for any regulatory or revalidation purpose unless you independently submit them to the relevant authority.',
      '<strong>Clinidex does not guarantee employability or application success.</strong> Checklists and coverage indicators are informational only and reflect your self-reported activities. We make no representation that meeting any checklist criteria will result in a successful application.',
    ],
  },
  {
    heading: 'Eligibility and accounts',
    body: [
      'You must be at least 18 years old to use the Service. By registering, you confirm that you meet this requirement.',
      'You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately at hello@clinidex.co.uk if you suspect unauthorised access.',
      'You may only hold one account. We reserve the right to suspend or terminate duplicate accounts.',
      'You must provide accurate and complete information when registering and keep it up to date.',
    ],
  },
  {
    heading: 'Acceptable use',
    body: [
      'You agree to use Clinidex lawfully and in accordance with these Terms. You must not:',
    ],
    list: [
      'Record patient-identifiable information (including patient names, dates of birth, NHS numbers, or any other information that could identify a patient) within the platform',
      'Upload any content that is unlawful, defamatory, harassing, obscene, or that infringes the intellectual property rights of any third party',
      'Attempt to access, probe, or test the security of the platform without express written permission',
      'Use automated tools to scrape, index, or extract data from the platform',
      'Share your account with other individuals or allow others to use the Service under your credentials',
      'Misrepresent your professional credentials or create false portfolio entries for the purpose of deceiving any employer, educational institution, or regulatory body',
      'Use the Service for any purpose other than your own professional development and portfolio management',
    ],
  },
  {
    heading: 'Patient data and clinical confidentiality',
    body: [
      'You have a professional and legal obligation to maintain patient confidentiality under the Data Protection Act 2018, UK GDPR, and GMC guidance. Clinidex is not designed for, and must not be used to store, any information that identifies or could identify a patient.',
      'All case and procedure entries must be written in anonymised form. You are solely responsible for ensuring that any content you upload does not breach patient confidentiality.',
      'In the event that you inadvertently record patient-identifiable information, you must delete it immediately. We reserve the right to remove such content and suspend your account if we become aware of it.',
    ],
  },
  {
    heading: 'Subscription, payment, and trial',
    body: [
      '<strong>Free trial.</strong> New accounts receive a free trial period of 180 days from the date of account creation, during which all features (including PDF export) are available at no charge.',
      '<strong>Pro subscription.</strong> After the trial period, continued access to premium features requires a paid Pro subscription. Pricing is as displayed on the platform at the time of purchase.',
      '<strong>Payment.</strong> Payments are processed by Stripe. By subscribing, you authorise us to charge your payment method on a recurring basis at the selected billing frequency (monthly or annual). Prices are inclusive of VAT where applicable.',
      '<strong>Cancellation.</strong> You may cancel your subscription at any time from the billing settings in your account. Cancellation takes effect at the end of the current billing period. We do not provide refunds for partial billing periods, except where required by law.',
      '<strong>Renewal.</strong> Subscriptions renew automatically unless cancelled before the renewal date. We will notify you by email before the first renewal.',
      '<strong>Price changes.</strong> We reserve the right to change subscription prices. We will give you at least 30 days\' notice of any price increase by email. Continued use after the effective date constitutes acceptance.',
      '<strong>Failed payments.</strong> If a payment fails, we will retry and notify you to update your payment method. After repeated failures, your subscription will be cancelled and premium features will be restricted.',
    ],
  },
  {
    heading: 'Your content and data ownership',
    body: [
      'You retain full ownership of all content you create and upload to Clinidex ("Your Content"). We do not claim any intellectual property rights over Your Content.',
      'By using the Service, you grant us a limited, non-exclusive, royalty-free licence to store, process, and display Your Content solely for the purpose of providing the Service to you.',
      'We will never use Your Content for training AI models, advertising, or any purpose other than delivering the Service.',
      'You can export Your Content at any time in PDF format. On account deletion, Your Content is permanently deleted from our systems within 30 days (see Privacy Policy for details).',
    ],
  },
  {
    heading: 'Intellectual property',
    body: [
      'The Clinidex platform, including its design, software, trademarks, and all content produced by us (but excluding Your Content), is owned by or licensed to Clinidex and is protected by UK intellectual property law.',
      'You may not copy, reproduce, distribute, modify, or create derivative works of any part of the platform without our express written consent.',
    ],
  },
  {
    heading: 'Availability and changes to the Service',
    body: [
      'We aim to maintain high availability of the Service but do not guarantee uninterrupted access. Scheduled maintenance will, where possible, be carried out during off-peak hours.',
      'We reserve the right to modify, suspend, or discontinue any part of the Service at any time. Where we make material changes that adversely affect you, we will give at least 30 days\' notice by email.',
      'We may introduce new features, change existing features, or alter the pricing structure for different tiers of service at any time.',
    ],
  },
  {
    heading: 'Disclaimer of warranties',
    body: [
      'The Service is provided "as is" and "as available". To the fullest extent permitted by law, we disclaim all warranties, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement.',
      'We do not warrant that the Service will be error-free, that defects will be corrected, or that the platform or the servers that make it available are free of viruses or other harmful components.',
      'Nothing in these Terms excludes or limits any statutory rights you may have as a consumer under applicable UK law.',
    ],
  },
  {
    heading: 'Limitation of liability',
    body: [
      'To the fullest extent permitted by applicable law, Clinidex shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of data, loss of profits, or loss of goodwill, arising out of or in connection with your use of the Service.',
      'Our total aggregate liability to you in connection with these Terms shall not exceed the greater of (a) the total subscription fees paid by you in the 12 months preceding the claim, or (b) £100.',
      'Nothing in these Terms limits or excludes our liability for death or personal injury caused by our negligence, fraud or fraudulent misrepresentation, or any other liability that cannot be excluded or limited by English law.',
    ],
  },
  {
    heading: 'Termination',
    body: [
      'You may delete your account at any time from the account settings page. On deletion, your data will be removed in accordance with our Privacy Policy.',
      'We may suspend or terminate your account immediately, without prior notice, if we have reasonable grounds to believe you have violated these Terms, particularly provisions relating to patient confidentiality or misrepresentation.',
      'On termination for breach, any active subscription will be cancelled without refund.',
      'Clauses that by their nature should survive termination (including data ownership, limitation of liability, and governing law) will continue to apply.',
    ],
  },
  {
    heading: 'Governing law and disputes',
    body: [
      'These Terms and any dispute arising in connection with them shall be governed by and construed in accordance with the laws of England and Wales.',
      'Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales, except where mandatory consumer protection law in your jurisdiction provides otherwise.',
      'Before commencing legal proceedings, we encourage you to contact us at hello@clinidex.co.uk. We will endeavour to resolve disputes informally where possible.',
    ],
  },
  {
    heading: 'Changes to these Terms',
    body: [
      'We may update these Terms from time to time. Where changes are material, we will notify you by email at least 14 days before the changes take effect.',
      'The "Last updated" date at the top of this page reflects the date of the most recent revision. Continued use of the Service after the effective date of any change constitutes acceptance of the revised Terms.',
    ],
  },
  {
    heading: 'Contact',
    body: [
      'If you have any questions about these Terms or wish to exercise any rights under them, please contact us at <strong>hello@clinidex.co.uk</strong>.',
    ],
  },
]
