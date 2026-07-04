import Stripe from 'stripe'

let client: Stripe | null = null

// Lazy singleton: stripe v17+ validates the secret key in the constructor, so
// a module-scope `new Stripe(...)` throws during `next build` page-data
// collection, where only placeholder public env vars exist.
export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-06-24.dahlia',
    })
  }
  return client
}

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID!
