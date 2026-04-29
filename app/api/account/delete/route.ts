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
      .select('stripe_subscription_id')
      .eq('id', user.id)
      .single()
    if (profileError) throw profileError

    if (profile?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
      const { stripe } = await import('@/lib/stripe')
      await stripe.subscriptions.cancel(profile.stripe_subscription_id)
    }

    const { data: files } = await service
      .from('evidence_files')
      .select('file_path')
      .eq('user_id', user.id)

    if (files && files.length > 0) {
      const paths = files.map((f: { file_path: string }) => f.file_path)
      const { error: storageError } = await service.storage.from('evidence').remove(paths)
      if (storageError) throw storageError
    }

    const { error: authDeleteError } = await service.auth.admin.deleteUser(user.id)
    if (authDeleteError) throw authDeleteError

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Account deletion error:', err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json({ error: 'Deletion failed. Please contact hello@clerkfolio.co.uk.' }, { status: 500 })
  }
}
