import { SectionHeader } from './section-header'

const faqs = [
  ['Is my data really private?', 'Yes. UK-hosted (London), AES-256 encrypted at rest and in transit, GDPR-aligned. You own your data and can export the lot as a ZIP at any time. Account deletion is permanent and complete.'],
  ['Will it accept patient identifiers?', 'No, by design. Every case form has anonymisation reminders, and the help text is explicit: no names, dates of birth, NHS numbers, or other identifiers. We never want to receive that data.'],
  ['Are you affiliated with the NHS, GMC or any Royal College?', "No. Clerkfolio is independent. We map onto specialty self-assessment criteria where each specialty publishes them — but we don't replace official portfolios required by deaneries."],
  ['Can I import from Horus?', 'Yes — Horus CSV bulk import is available on the Pro plan. Free and Student users can still add entries one at a time, or copy across by hand.'],
  ['What happens to my portfolio if I stop subscribing?', 'Your data stays on the Free tier — read, edit, log, export, all free. You only lose Pro-tier limits (storage, unlimited exports, multiple tracked specialties). Nothing gets deleted.'],
  ['Does it work on my phone?', 'Yes. Clerkfolio is a responsive web app — log a case from your phone between patients, finish writing it up on a laptop later. Drafts auto-save as you type, so you can pick up exactly where you left off.'],
] as const

export function FAQ() {
  return (
    <section id="faq" className="bg-[#141416] px-6 py-24 md:px-14 lg:py-32">
      <SectionHeader number="006" label="FAQ" title="The questions doctors actually ask." />
      <div className="mt-16 grid gap-4 md:grid-cols-2">
        {faqs.map(([question, answer]) => (
          <details key={question} className="group rounded-[10px] border border-white/[0.08] bg-[#0B0B0C] px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink">
              {question}
              <span className="text-accent group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <p className="mt-2.5 text-[13px] leading-[1.6] text-ink-soft">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
