import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'

export async function POST(request: NextRequest) {
  const originError = validateOrigin(request)
  if (originError) return originError

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { confirm?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (body.confirm !== 'DELETE') {
    return NextResponse.json({ error: 'Confirmation text required' }, { status: 400 })
  }

  const service = createServiceClient()

  try {
    const { data: profile, error: profileError } = await service
      .from('profiles')
      .select('stripe_subscription_id, subscription_period_end')
      .eq('id', user.id)
      .single()
    if (profileError) throw profileError

    if (profile?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
      const { stripe } = await import('@/lib/stripe')
      // Cancel at period end rather than immediately so we honour the paid
      // period the user already paid for. Stripe will fire
      // customer.subscription.deleted when the period actually ends; by that
      // point the auth user is gone and the webhook update no-ops cleanly.
      // If the user wants an immediate refund they must contact support, and
      // we issue a pro-rated refund manually.
      //
      // Only `resource_missing` (subscription already gone / never existed)
      // is safe to swallow. Any other error aborts the delete - otherwise
      // a transient Stripe outage would result in a deleted account that is
      // still being billed at the next renewal, with no DB pointer left to
      // resolve the charge.
      try {
        await stripe.subscriptions.update(profile.stripe_subscription_id, {
          cancel_at_period_end: true,
        })
      } catch (err) {
        const code = (err as { code?: string })?.code
        if (code !== 'resource_missing') {
          console.error(
            'Account delete blocked: Stripe cancel failed:',
            err instanceof Error ? err.message : 'unknown'
          )
          return NextResponse.json(
            {
              error:
                'Could not cancel your subscription. Account deletion is paused so you are not charged for a service you cannot access. Please email hello@clerkfolio.co.uk and we will cancel and refund manually.',
            },
            { status: 422 }
          )
        }
      }
    }

    const { data: files } = await service
      .from('evidence_files')
      .select('file_path')
      .eq('user_id', user.id)

    if (files && files.length > 0) {
      // Supabase storage.remove() caps the array at ~1000 paths server-side.
      // Chunk to 500 for headroom; an account with thousands of evidence files
      // would otherwise leave orphans in the bucket after deletion.
      const paths = files.map((f: { file_path: string }) => f.file_path)
      const CHUNK = 500
      for (let offset = 0; offset < paths.length; offset += CHUNK) {
        const slice = paths.slice(offset, offset + CHUNK)
        const { error: storageError } = await service.storage.from('evidence').remove(slice)
        if (storageError) throw storageError
      }
    }

    const { error: authDeleteError } = await service.auth.admin.deleteUser(user.id)
    if (authDeleteError) throw authDeleteError

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Account deletion error:', err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json({ error: 'Deletion failed. Please contact hello@clerkfolio.co.uk.' }, { status: 500 })
  }
}
