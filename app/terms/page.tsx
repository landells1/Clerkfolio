export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0C] text-[#F5F5F2] px-6 py-12">
      <article className="mx-auto max-w-3xl space-y-8">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Terms of service</h1>
          <p className="mt-2 text-sm text-[rgba(245,245,242,0.5)]">Last updated: 28 April 2026</p>
        </header>

        <Section title="Use of Clinidex">
          <p>Clinidex is a personal portfolio organisation tool for UK medical students and foundation doctors. It is not a supervisor sign-off system, not a formal ARCP submission tool, and not a replacement for Horus, NHS ePortfolio, ISCP, or Royal College systems.</p>
        </Section>

        <Section title="No advice or benchmarking">
          <p>Clinidex shows your own collated data. It does not tell you whether you are competitive, on track, or likely to succeed in an application or ARCP outcome.</p>
        </Section>

        <Section title="Anonymisation">
          <p>You must not upload or type patient-identifiable information, including names, dates of birth, NHS numbers, hospital numbers, addresses, or unusually identifying case details.</p>
        </Section>

        <Section title="Plans">
          <p>Free accounts include core cases, portfolio, dashboard, timeline, ARCP tracking, personal data backup, and one lifetime PDF export and share link. Free accounts can track one specialty at a time and have 100 MB storage. Pro is GBP 10 per year and includes 5 GB storage plus unrestricted Pro features. Verified medical student accounts may receive Student access under the rules shown in the product.</p>
        </Section>

        <Section title="Data ownership">
          <p>You own your portfolio data. You can export it from Settings. Downgrading a subscription may block new Pro-only actions or uploads, but Clinidex will not delete existing user data because of a downgrade.</p>
        </Section>

        <Section title="Contact">
          <p>Questions about these terms or data requests should be sent to admin@clinidex.co.uk.</p>
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
