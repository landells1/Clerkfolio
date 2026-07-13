import { SectionHeader } from './section-header'
import { MockExport } from './mocks/mock-export'

const reassurances = [
  ['Patient information', 'Do not enter names, dates of birth, NHS numbers or other patient-identifiable information.'],
  ['Focused sharing', 'Portfolio share links require a PIN and an expiry date. Case entries are never included.'],
  ['Your records', 'Export your data when you need it and request account deletion when you are finished.'],
] as const

export function TrustAndControl() {
  return (
    <section id="privacy-and-control" className="bg-[var(--bg-surface)] px-6 py-16 sm:py-20 md:px-14 lg:py-24">
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-14">
        <div>
          <SectionHeader
            label="Privacy and control"
            title="Built for careful professional record-keeping."
            sub="Clerkfolio helps you organise professional evidence without turning clinical records into shareable portfolio content."
          />
          <div className="mt-8 space-y-5">
            {reassurances.map(([title, body]) => (
              <div key={title} className="border-l-2 border-accent/50 pl-4">
                <h3 className="text-sm font-medium text-ink">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-ink-soft">{body}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 rounded-xl border border-default bg-[var(--bg-canvas)] p-4 text-sm leading-6 text-ink-soft">
            Clerkfolio is independent. It is not affiliated with the NHS, GMC or any Royal College, and it does not replace a portfolio required by your deanery or training programme.
          </p>
        </div>
        <MockExport className="h-auto lg:mt-2" />
      </div>
    </section>
  )
}
