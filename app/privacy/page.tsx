export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0C] text-[#F5F5F2] px-6 py-12">
      <article className="mx-auto max-w-3xl space-y-8">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Privacy policy</h1>
          <p className="mt-2 text-sm text-[rgba(245,245,242,0.5)]">Last updated: 28 April 2026</p>
        </header>

        <Section title="What we collect">
          <p>We collect your email address, profile details, career stage, portfolio entries, anonymised cases, goals, specialty trackers, evidence files you upload, referral activity, usage counters, and payment metadata from Stripe. Do not enter patient-identifiable information into Clerkfolio.</p>
        </Section>

        <Section title="Why we use it">
          <p>We use this data to run the Clerkfolio service, authenticate your account, store your portfolio, generate exports, manage billing, send requested email reminders, prevent abuse, and answer support requests.</p>
        </Section>

        <Section title="Where data is stored">
          <p>Application data and uploaded evidence files are stored in Supabase in the London region (eu-west-2). Vercel hosts the application. Authentication session cookies are used to keep you signed in.</p>
        </Section>

        <Section title="Sub-processors">
          <ul>
            <li>Supabase: database, authentication, and storage in London.</li>
            <li>Stripe: subscription and billing metadata through Stripe Payments UK.</li>
            <li>Resend: transactional email delivery; Resend is US-based.</li>
            <li>Vercel: web hosting and deployment; application data remains in Supabase.</li>
          </ul>
        </Section>

        <Section title="Retention">
          <p>Soft-deleted portfolio entries and cases remain in trash for up to 30 days before purge. Audit logs are retained for one year. Account deletion removes live account data immediately through cascading deletes, with backups retained for up to 30 days.</p>
        </Section>

        <Section title="Your UK GDPR rights">
          <p>You can request access, rectification, deletion, portability, or objection to processing. You can export your own data from Settings at any time. For privacy requests, email admin@clerkfolio.co.uk.</p>
        </Section>

        <Section title="Cookies and analytics">
          <p>Clerkfolio uses authentication cookies required for login sessions. If analytics are enabled, they are used to understand aggregate product usage, not to sell or broker personal data.</p>
        </Section>

        <Section title="Data Controller & Contact">
          <p>Clerkfolio is operated by Clerkfolio Ltd, registered in England and Wales.</p>
          <p>For data subject requests including access, deletion, rectification, portability, or any privacy-related query, contact us at admin@clerkfolio.co.uk.</p>
          <p>We aim to respond to all requests within 30 days as required by UK GDPR.</p>
        </Section>
      </article>
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
