import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia' as Stripe.LatestApiVersion,
})

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID!
