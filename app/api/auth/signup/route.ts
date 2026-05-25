import { NextRequest, NextResponse } from 'next/server'
import { validateOrigin } from '@/lib/csrf'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

const SIGNUP_LIMIT = { max: 5, windowSeconds: 60 * 60, prefix: 'auth-signup' }

function clientIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
}

function statusRedirect(req: NextRequest, state: string, headers?: Record<string, string>) {
  const target = new URL('/signup/status', req.nextUrl.origin)
  target.searchParams.set('state', state)
  return NextResponse.redirect(target, { status: 303, headers })
}

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const form = await req.formData().catch(() => null)
  const email = typeof form?.get('email') === 'string' ? String(form.get('email')).trim() : ''
  const password = typeof form?.get('password') === 'string' ? String(form.get('password')) : ''
  const confirmPassword = typeof form?.get('confirmPassword') === 'string' ? String(form.get('confirmPassword')) : ''
  const referralInput = typeof form?.get('referralCode') === 'string' ? String(form.get('referralCode')).trim().toUpperCase() : ''

  if (!email || password.length < 8 || password !== confirmPassword) {
    return statusRedirect(req, 'invalid')
  }

  const rateLimit = await checkRateLimit({
    key: clientIp(req),
    ...SIGNUP_LIMIT,
  })
  if (!rateLimit.success) {
    return statusRedirect(req, 'rate_limited', rateLimitHeaders(rateLimit, SIGNUP_LIMIT.windowSeconds))
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
  const supabase = createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: new URL('/auth/callback?next=/onboarding', appUrl).toString(),
      data: {
        referral_code: /^[A-Z]{5}$/.test(referralInput) ? referralInput : null,
      },
    },
  })

  if (error) {
    return statusRedirect(req, 'unavailable')
  }

  return statusRedirect(req, 'sent')
}
