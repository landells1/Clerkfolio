import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

function getPeriodEnd(subscription: Stripe.Subscription): string | null {
  // Newer Stripe API versions (2025+) moved current_period_end to items level
  const topLevel = (subscription as any).current_period_end as number | undefined
  const itemLevel = (subscription.items?.data?.[0] as any)?.current_period_end as number | undefined
  const ts = topLevel ?? itemLevel
  return ts ? new Date(ts * 1000).toISOString() : null
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: `Webhook error: ${String(err)}` }, { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription') break

      const userId = session.metadata?.supabase_user_id
      if (!userId) break

      // Verify the Stripe customer matches what we have on record (or is being set for the first time)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single()

      if (
        existingProfile?.stripe_customer_id &&
        existingProfile.stripe_customer_id !== (session.customer as string)
      ) {
        console.error(`Webhook customer mismatch for user ${userId}`)
        break
      }

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

      await supabase.from('profiles').update({
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscription.id,
        subscription_status: 'active',
        subscription_period_end: getPeriodEnd(subscription),
      }).eq('id', userId)

      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription

      const status = subscription.status === 'active' ? 'active'
        : subscription.status === 'past_due' ? 'past_due'
        : 'cancelled'

      await supabase.from('profiles').update({
        subscription_status: status,
        subscription_period_end: getPeriodEnd(subscription),
      }).eq('stripe_subscription_id', subscription.id)

      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription

      await supabase.from('profiles').update({
        subscription_status: 'cancelled',
        stripe_subscription_id: null,
        subscription_period_end: null,
      }).eq('stripe_subscription_id', subscription.id)

      break
    }
  }

  return NextResponse.json({ received: true })
}
