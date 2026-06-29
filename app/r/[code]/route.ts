import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

function unknownReferralResponse() {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Unknown referral code</title></head><body style="margin:0;background:#EDE8D0;color:#26241E;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><main style="min-height:100vh;display:grid;place-items:center;padding:24px"><section style="max-width:420px;border:1px solid #D2CAAC;background:#F5F1E1;border-radius:16px;padding:28px"><p style="margin:0 0 8px;color:#1D4ED8;font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:700">Referral</p><h1 style="margin:0 0 10px;font-size:24px">Unknown referral code</h1><p style="margin:0 0 20px;color:#595444;font-size:14px;line-height:1.5">This referral link is not valid. Check the link with the person who sent it, or continue without a referral.</p><a href="/signup" style="display:inline-flex;min-height:40px;align-items:center;border-radius:10px;background:#1B6FD9;color:#FFFFFF;padding:0 16px;text-decoration:none;font-size:14px;font-weight:700">Continue to signup</a></section></main></body></html>`,
    { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params
  const code = rawCode.trim().toUpperCase()
  if (!/^[A-Z0-9]{5}$/.test(code)) return unknownReferralResponse()

  const service = createServiceClient()
  const { data: referrer, error } = await service
    .from('profiles')
    .select('id, referral_code')
    .eq('referral_code', code)
    .maybeSingle()

  if (error || !referrer) return unknownReferralResponse()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const url = req.nextUrl.clone()
  url.search = ''

  if (!user) {
    // New / logged-out visitor: carry the code into signup, where referral
    // attribution is actually applied.
    url.pathname = '/signup'
    url.searchParams.set('ref', code)
    return NextResponse.redirect(url)
  }

  if (user.id === referrer.id) {
    // The referrer clicked their own link - send them to manage referrals.
    url.pathname = '/settings/referrals'
    url.searchParams.set('ref', 'self')
    return NextResponse.redirect(url)
  }

  // Already-authenticated, different user: referrals only apply to new
  // signups, so there is nothing to attribute. Don't append a dangling `ref`
  // the dashboard never consumes; explain the no-op with a flag the dashboard
  // can surface.
  url.pathname = '/dashboard'
  url.searchParams.set('referral', 'existing-account')
  return NextResponse.redirect(url)
}
