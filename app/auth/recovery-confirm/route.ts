import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RECOVERY_COOKIE = 'cf_recovery'

// Server-side handler for Supabase recovery (password reset) confirmations
// that arrive via token_hash + type=recovery in the email link template.
//
// /auth/confirm has a client-side verifyOtp path that handles recovery, BUT
// the client cannot set the HTTP-only `cf_recovery` cookie that middleware
// requires before letting /update-password render. So if Supabase templates
// ever point recovery emails at /auth/confirm, the user lands on
// /update-password and immediately bounces away.
//
// This route runs the OTP exchange server-side and sets the cookie, mirroring
// the /auth/callback?code=... path used for newer PKCE-style recovery links.
// /auth/confirm now redirects recovery here.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash') ?? ''
  if (!tokenHash) {
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed&type=recovery`)
  }

  const supabase = createClient()

  // Mirror the /auth/confirm client-side guard: if a different user is already
  // signed in when this recovery link is clicked (shared device, mirrored
  // inbox), sign them out before exchanging the token. Without this, the
  // session silently swaps to the recovery-link owner while the browser still
  // shows the other user's dashboard context.
  const { data: { user: existingUser } } = await supabase.auth.getUser()
  if (existingUser) {
    await supabase.auth.signOut()
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'recovery',
  })

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed&type=recovery`)
  }

  const response = NextResponse.redirect(`${origin}/update-password`)
  response.cookies.set(RECOVERY_COOKIE, '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 120,
  })
  return response
}
