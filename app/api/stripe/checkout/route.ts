import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, STRIPE_PRICE_ID } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, first_name, last_name')
    .eq('id', user.id)
    .single()

  // Reuse or create Stripe customer
  let customerId = profile?.stripe_customer_id ?? null

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id

    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  const origin = request.headers.get('origin') ?? 'https://medclinidex.vercel.app'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${origin}/settings?upgraded=true`,
    cancel_url: `${origin}/settings`,
    allow_promotion_codes: true,
    metadata: { supabase_user_id: user.id },
  })

  return NextResponse.json({ url: session.url })
}
