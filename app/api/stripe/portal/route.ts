import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { validateOrigin } from '@/lib/csrf'

export async function POST(request: NextRequest) {
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
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No Stripe customer is linked to this account. If your Pro access was granted manually, contact support to set up billing management.' },
      { status: 400 }
    )
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${APP_URL}/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe portal error:', err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json({ error: 'Failed to open billing portal' }, { status: 500 })
  }
}
