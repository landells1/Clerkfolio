import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

type WithPeriodEnd = { current_period_end?: number }

function getPeriodEnd(subscription: Stripe.Subscription): string | null {
  // Newer Stripe API versions (2025+) moved current_period_end to items level
  const topLevel = (subscription as unknown as WithPeriodEnd).current_period_end
  const itemLevel = (subscription.items?.data?.[0] as unknown as WithPeriodEnd | undefined)?.current_period_end
  const ts = topLevel ?? itemLevel
  return ts ? new Date(ts * 1000).toISOString() : null
}

function hasPaidAccess(subscription: Stripe.Subscription) {
  // `active`, `trialing` and `past_due` all imply the user has paid for the
  // current period - Stripe only flips `past_due` -> `canceled` after all
  // retry attempts are exhausted (typically 7 days of dunning). Keep Pro
  // features available during that window so a failed card on day 1 of a
  // 365-day cycle does not strip the user of features they have paid for.
  // The user separately gets an in-app notification on `invoice.payment_failed`.
  return ['active', 'trialing', 'past_due'].includes(subscription.status)
}

async function handleStripeEvent(
  event: Stripe.Event,
  supabase: ReturnType<typeof createServiceClient>,
) {
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
        // Return non-2xx so Stripe retries; the next reconciling event should resolve it.
        // Logging without the customer IDs is intentional - keep webhook logs free of PII.
        console.error('Webhook customer mismatch on checkout.session.completed for user', userId)
        return NextResponse.json({ error: 'Customer mismatch' }, { status: 409 })
      }

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
      if (!hasPaidAccess(subscription)) break

      const { error: activateError } = await supabase.from('profiles').update({
        tier: 'pro',
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscription.id,
        subscription_period_end: getPeriodEnd(subscription),
      }).eq('id', userId)

      if (activateError) {
        console.error('Webhook: failed to activate subscription:', activateError.message)
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
      }

      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription

      const { error: updateError } = await supabase.from('profiles').update({
        tier: hasPaidAccess(subscription) ? 'pro' : 'free',
        subscription_period_end: getPeriodEnd(subscription),
      }).eq('stripe_subscription_id', subscription.id)

      if (updateError) {
        console.error('Webhook: failed to update subscription:', updateError.message)
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
      }

      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription

      const { error: deleteError } = await supabase.from('profiles').update({
        tier: 'free',
        stripe_subscription_id: null,
        subscription_period_end: null,
      }).eq('stripe_subscription_id', subscription.id)

      if (deleteError) {
        console.error('Webhook: failed to cancel subscription:', deleteError.message)
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
      }

      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
      if (!customerId) break

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()

      if (profile?.id) {
        await supabase.from('audit_log').insert({
          user_id: profile.id,
          action: 'stripe_payment_failed',
          metadata: { invoice_id: invoice.id, attempt_count: invoice.attempt_count },
        })
        // Insert an in-app notification so the user sees the failure on next login
        await supabase.from('notifications').insert({
          user_id: profile.id,
          type: 'payment_failed',
          title: 'Payment failed - please update your billing details',
          body: 'Your subscription payment could not be processed. Visit Settings to update your payment method.',
          action_url: '/settings',
        })
      }
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      const customerId = typeof charge.customer === 'string' ? charge.customer : charge.customer?.id
      if (!customerId) break

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()

      if (profile?.id) {
        await supabase.from('audit_log').insert({
          user_id: profile.id,
          action: 'stripe_charge_refunded',
          metadata: { charge_id: charge.id, amount_refunded: charge.amount_refunded },
        })
      }
      break
    }

    case 'charge.dispute.created': {
      const dispute = event.data.object as Stripe.Dispute
      const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id

      // Look up the user via the associated charge's customer
      if (chargeId) {
        const charge = await stripe.charges.retrieve(chargeId)
        const customerId = typeof charge.customer === 'string' ? charge.customer : charge.customer?.id
        if (customerId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle()

          if (profile?.id) {
            await supabase.from('audit_log').insert({
              user_id: profile.id,
              action: 'stripe_dispute_created',
              metadata: { dispute_id: dispute.id, amount: dispute.amount, reason: dispute.reason },
            })
          }
        }
      }
      break
    }
  }

  return NextResponse.json({ received: true })
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

  Sentry.setTag('stripe.event_type', event.type)
  Sentry.setTag('stripe.event_id', event.id)

  const supabase = createServiceClient()
  const { error: eventInsertError } = await supabase.from('stripe_webhook_events').insert({
    event_id: event.id,
    event_type: event.type,
    livemode: event.livemode,
    api_version: event.api_version,
  })

  if (eventInsertError) {
    if (eventInsertError.code === '23505') {
      // Already-seen event. Only short-circuit if it was previously processed
      // through to completion. If a prior attempt inserted the row but the
      // handler threw before marking processed_at, fall through and reprocess
      // so Stripe retries are not silently dropped.
      const { data: existing } = await supabase
        .from('stripe_webhook_events')
        .select('processed_at')
        .eq('event_id', event.id)
        .maybeSingle()
      if (existing?.processed_at) {
        return NextResponse.json({ received: true, duplicate: true })
      }
      // Reprocess in place.
    } else {
      console.error('Webhook: failed to record Stripe event:', eventInsertError.message)
      return NextResponse.json({ error: 'Webhook idempotency write failed' }, { status: 500 })
    }
  }

  let response: NextResponse
  try {
    response = await Sentry.startSpan(
      { name: `stripe.webhook ${event.type}`, op: 'webhook.stripe', attributes: { 'stripe.event_id': event.id } },
      () => handleStripeEvent(event, supabase),
    )
  } catch (err) {
    // Handler threw. Leave the idempotency row unprocessed so Stripe's retry
    // re-enters this route, hits the duplicate branch, sees processed_at IS NULL,
    // and reprocesses. Return 500 so Stripe schedules a retry.
    Sentry.captureException(err, { tags: { route: '/api/stripe/webhook', stripe_event_id: event.id } })
    console.error('Webhook handler threw:', err instanceof Error ? `${err.name}: ${err.message}` : err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  if (response.status >= 400) {
    // Handler returned a deliberate error response. Drop the idempotency row
    // so Stripe's retry runs the handler again from scratch.
    await supabase.from('stripe_webhook_events').delete().eq('event_id', event.id)
    return response
  }

  const { error: processedError } = await supabase
    .from('stripe_webhook_events')
    .update({ processed_at: new Date().toISOString() })
    .eq('event_id', event.id)

  if (processedError) {
    console.error('Webhook: failed to mark Stripe event processed:', processedError.message)
  }

  return response
}
