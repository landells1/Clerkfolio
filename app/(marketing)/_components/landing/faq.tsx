import { LANDING_FAQS } from '@/lib/marketing/faqs'
import { SectionHeader } from './section-header'

const faqs = LANDING_FAQS

export function FAQ() {
  return (
    <section id="faq" className="bg-[var(--bg-surface)] px-6 py-16 sm:py-20 md:px-14 xl:py-20">
      <SectionHeader label="Practical details" title="Frequently asked questions." />
      <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-12 md:grid-cols-2">
        {faqs.map(([question, answer]) => (
          <details key={question} className="group rounded-[10px] border border-default bg-[var(--bg-canvas)] px-5 py-4">
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
