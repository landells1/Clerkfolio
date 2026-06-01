import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe, STRIPE_PRICE_ID } from '@/lib/stripe'
import { validateOrigin } from '@/lib/csrf'

export async function POST(request: NextRequest) {
  // Use a server-side canonical URL - never trust the incoming Origin header for billing redirects
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL
  if (!APP_URL) {
    console.error('NEXT_PUBLIC_APP_URL is not set — Stripe redirect URLs will be broken')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }
  const originError = validateOrigin(request)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, stripe_subscription_id, tier, first_name, last_name')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id ?? null

  try {
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      const service = createServiceClient()
      const { error: customerPersistError } = await service
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)

      if (customerPersistError) {
        console.error('Stripe customer persistence failed:', customerPersistError.message)
        return NextResponse.json({ error: 'Failed to prepare billing profile' }, { status: 500 })
      }
    }

    const subscriptionId = profile?.stripe_subscription_id ?? null
    const hasActiveStripeSubscription = subscriptionId
      ? await stripe.subscriptions.retrieve(subscriptionId)
        .then(subscription => ['active', 'trialing', 'past_due', 'unpaid'].includes(subscription.status))
        .catch(() => false)
      : false

    if (profile?.tier === 'pro' || hasActiveStripeSubscription) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${APP_URL}/settings`,
      })
      return NextResponse.json({ url: portal.url })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${APP_URL}/settings?upgraded=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/settings`,
      allow_promotion_codes: true,
      metadata: { supabase_user_id: user.id },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
