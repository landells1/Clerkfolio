import Link from 'next/link'
import { MARKETING_PRICING_FEATURES, PRICING_TIERS } from '@/lib/marketing/pricing'
import { SectionHeader } from './section-header'

export function Pricing() {
  return (
    <section id="pricing" className="px-6 py-24 md:px-14 lg:py-32">
      <SectionHeader
        number="005"
        label="Pricing"
        title="Free forever. Pro when you need it."
        sub="No card required to start. Free tier is genuinely useful, not a teaser. Pro is £10 a year — about a coffee an academic term."
      />
      <div className="mt-16 grid gap-6 lg:grid-cols-3">
        {PRICING_TIERS.map((tier) => {
          const features = MARKETING_PRICING_FEATURES[tier.name]
          return (
            <article
              key={tier.name}
              className={`relative rounded-2xl border p-7 ${
                tier.highlight
                  ? 'border-blue-500/45 bg-gradient-to-b from-blue-500/10 to-[#141416]'
                  : 'border-white/[0.08] bg-[#141416]'
              }`}
            >
              {tier.highlight ? <span className="absolute right-5 top-[-10px] rounded border border-blue-500/45 bg-[#0B0B0C] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6AA8FF]">Recommended</span> : null}
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">{tier.name}</p>
              <h3 className="mt-4 text-3xl font-medium tracking-[-0.03em]">{tier.marketingPrice}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{tier.marketingDescription}</p>
              <ul className="mt-7 space-y-3">
                {features.map((feature) => <li key={feature} className="text-sm text-ink-soft"><span className="mr-2 text-accent">✓</span>{feature}</li>)}
              </ul>
              <Link href={tier.name === 'Pro' ? '/upgrade' : '/signup'} className={`mt-8 inline-flex w-full justify-center rounded-lg px-4 py-3 text-sm font-semibold ${tier.name === 'Pro' ? 'bg-accent text-surface' : 'border border-white/[0.12] text-ink'}`}>
                {tier.name === 'Pro' ? 'Upgrade to Pro' : 'Start free'}
              </Link>
            </article>
          )
        })}
      </div>
    </section>
  )
}
