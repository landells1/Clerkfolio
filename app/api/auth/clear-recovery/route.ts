import { NextRequest, NextResponse } from 'next/server'
import { validateOrigin } from '@/lib/csrf'

// Clears the short-lived `cf_recovery` cookie set by /auth/callback after a
// successful password change. Middleware uses that cookie to gate access to
// /update-password; clearing it after the password change prevents reuse.
export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const response = NextResponse.json({ success: true })
  response.cookies.set('cf_recovery', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
