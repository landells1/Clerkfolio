import { MARKETING_PRICING_FEATURES, PRICING_TIERS } from '@/lib/marketing/pricing'
import { SectionHeader } from './section-header'

export function Pricing() {
  return (
    <section id="pricing" className="px-6 py-16 sm:py-20 md:px-14 xl:py-20">
      <SectionHeader
        label="Pricing"
        title="Free to use. Upgrade to Pro when you need more."
        sub={`No card needed to start. The free plan is fully usable on its own. Pro is \u00A39.99 a year.`}
      />
      <div className="mt-10 grid grid-cols-1 gap-6 sm:mt-12 lg:grid-cols-3">
        {PRICING_TIERS.map((tier) => {
          const features = MARKETING_PRICING_FEATURES[tier.name]
          return (
            <article
              key={tier.name}
              className={`relative rounded-2xl border p-5 sm:p-7 ${
                tier.highlight
                  ? 'border-accent/45 bg-gradient-to-b from-accent/10 to-[var(--bg-surface)]'
                  : 'border-default bg-[var(--bg-surface)]'
              }`}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">{tier.name}</p>
              <h3 className="mt-4 text-3xl font-medium tracking-[-0.03em]">{tier.marketingPrice}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{tier.marketingDescription}</p>
              <ul className="mt-7 space-y-3">
                {features.map((feature) => (
                  <li key={feature} className="text-sm text-ink-soft">
                    <span className="mr-2 text-accent">&#10003;</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <span
                aria-disabled="true"
                className={`mt-8 inline-flex w-full cursor-default select-none justify-center rounded-lg px-4 py-3 text-sm font-semibold ${tier.name === 'Pro' ? 'bg-accent/70 text-white' : 'border border-strong text-ink-soft'}`}
              >
                Coming soon
              </span>
            </article>
          )
        })}
      </div>
      <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-6 text-ink-soft">
        Working in the NHS? Verifying an <span className="text-ink">nhs.net</span> (or other NHS) email adds
        extra storage to the free <span className="text-ink">Verified</span> plan. ARCP capability tracking is
        included for eligible training stages - set yours during onboarding.
      </p>
    </section>
  )
}
