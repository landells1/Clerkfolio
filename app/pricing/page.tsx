import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { JsonLd } from '@/components/seo/json-ld'
import { createClient } from '@/lib/supabase/server'
import {
  REFERRAL_STORAGE_BONUS_AT,
  REFERRAL_STORAGE_BONUS_MB,
  VERIFIED_BONUS_MB,
} from '@/lib/entitlements/limits'
import { marketingMetadata, SITE_URL } from '@/lib/marketing/metadata'
import { MARKETING_PRICING_FEATURES, PRICING_FEATURES, PRICING_TIERS } from '@/lib/marketing/pricing'
import { CtaFooter } from '../(marketing)/_components/landing/cta-footer'
import { Nav } from '../(marketing)/_components/landing/nav'

export const metadata = marketingMetadata({
  title: 'Pricing - Clerkfolio',
  description: 'Clerkfolio is free forever for core portfolio tools. Verify an .ac.uk or NHS email for extra storage, or go Pro for £9.99 a year - unlimited exports, share links and tracked specialties.',
  path: '/pricing',
})

function pricingStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Pricing', item: `${SITE_URL}/pricing` },
        ],
      },
    ],
  }
}

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === 'string') return <span>{value}</span>
  return value
    ? <span className="text-accent" aria-label="Included">&#10003;</span>
    : <span className="text-ink-dim" aria-label="Not included">-</span>
}

export default async function PricingPage() {
  // Logged-in users manage their plan in-app; middleware used to bounce them
  // to a dead /dashboard#pricing anchor, so keep sending them to /upgrade.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/upgrade')

  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg-canvas)] text-ink">
      <JsonLd data={pricingStructuredData()} nonce={nonce} />
      <Nav />
      <main className="px-6 py-12 sm:py-16 md:px-14 lg:py-20">
        <header className="max-w-3xl">
          <h1 className="text-[clamp(34px,7vw,52px)] font-medium leading-[1.05] tracking-[-0.045em] text-ink">
            Free to use. Upgrade when you need more.
          </h1>
          <p className="mt-5 max-w-[620px] text-base leading-[1.6] text-ink-soft sm:text-lg">
            The free plan is fully usable on its own - log cases and portfolio entries, track a
            specialty, export your data. No card needed. Pro is {'£'}9.99 a year, for
            application season.
          </p>
        </header>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {PRICING_TIERS.map(tier => {
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
                <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">{tier.name}</h2>
                <p className="mt-4 text-3xl font-medium tracking-[-0.03em]">{tier.marketingPrice}</p>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{tier.marketingDescription}</p>
                <ul className="mt-7 space-y-3">
                  {features.map(feature => (
                    <li key={feature} className="text-sm text-ink-soft">
                      <span className="mr-2 text-accent" aria-hidden>&#10003;</span>
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

        <section className="mt-16 max-w-4xl">
          <h2 className="text-2xl font-medium tracking-[-0.03em]">Compare plans in detail</h2>
          <div className="mt-6 overflow-x-auto rounded-xl border border-default">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-default bg-[var(--bg-surface)]">
                  <th scope="col" className="px-4 py-3 font-medium text-ink">Feature</th>
                  <th scope="col" className="px-4 py-3 font-medium text-ink">Free</th>
                  <th scope="col" className="px-4 py-3 font-medium text-ink">Verified</th>
                  <th scope="col" className="px-4 py-3 font-medium text-ink">Pro</th>
                </tr>
              </thead>
              <tbody>
                {PRICING_FEATURES.map(row => (
                  <tr key={row.label} className="border-b border-subtle last:border-b-0">
                    <th scope="row" className="px-4 py-3 font-normal text-ink-soft">{row.label}</th>
                    <td className="px-4 py-3 text-ink-soft"><FeatureCell value={row.free} /></td>
                    <td className="px-4 py-3 text-ink-soft"><FeatureCell value={row.verified} /></td>
                    <td className="px-4 py-3 text-ink-soft"><FeatureCell value={row.pro} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-14 max-w-3xl space-y-6">
          <h2 className="text-2xl font-medium tracking-[-0.03em]">The small print, in plain English</h2>
          <div className="space-y-4 text-[15px] leading-[1.65] text-ink-soft">
            <p>
              <strong className="font-medium text-ink">Verified is free.</strong> Confirm a
              university (.ac.uk) or NHS email address and your storage grows
              by {VERIFIED_BONUS_MB} MB. One verified email per account.
            </p>
            <p>
              <strong className="font-medium text-ink">Referrals earn real allowances.</strong> Each
              successful referral adds one PDF export and one share link to a free account, and
              {' '}{REFERRAL_STORAGE_BONUS_AT} referrals add {REFERRAL_STORAGE_BONUS_MB} MB of
              permanent storage. Details in the{' '}
              <Link href="/terms" className="text-[var(--accent-text)] underline underline-offset-2">terms</Link>.
            </p>
            <p>
              <strong className="font-medium text-ink">Stopping Pro never deletes your data.</strong> If
              a subscription lapses you drop back to free-tier limits: everything you logged stays
              readable, editable and exportable. A full storage quota only blocks new uploads -
              existing files are never removed.
            </p>
            <p>
              <strong className="font-medium text-ink">UK consumer rights apply.</strong> Pro comes
              with the standard 14-day cooling-off period under the Consumer Contracts Regulations
              2013 - the mechanics are set out in the{' '}
              <Link href="/terms" className="text-[var(--accent-text)] underline underline-offset-2">terms of service</Link>.
              Payments are processed by Stripe; we never see your card details.
            </p>
          </div>
        </section>
      </main>
      <CtaFooter />
    </div>
  )
}
