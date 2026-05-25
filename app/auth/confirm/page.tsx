'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { clearClientStateOnAuthChange } from '@/lib/client-cleanup'

const ALLOWED_NEXT_PATHS = new Set([
  '/dashboard',
  '/onboarding',
  '/settings',
  '/portfolio',
  '/cases',
  '/specialties',
  '/export',
  '/update-password',
])

function safeRedirectPath(next: string | null): string {
  if (!next) return '/onboarding'
  if (!next.startsWith('/') || next.startsWith('//')) return '/onboarding'
  if (ALLOWED_NEXT_PATHS.has(next)) return next
  for (const allowed of ALLOWED_NEXT_PATHS) {
    if (next.startsWith(allowed + '/')) return next
  }
  return '/onboarding'
}

// email_change is intentionally excluded. The settings page disables the email
// field so users cannot initiate an email change through the UI. Keeping
// email_change here would allow a dev-console caller to bypass the reauth
// requirement in /api/account/email-change (not yet implemented). A full
// email-change flow with current-password reauth should be added before
// re-enabling this type.
const ALLOWED_OTP_TYPES = new Set(['signup', 'email', 'invite', 'recovery'])

function ConfirmContent() {
  const searchParams = useSearchParams()
  const tokenHash = searchParams.get('token_hash') ?? ''
  const typeParam = searchParams.get('type') ?? ''
  const type = ALLOWED_OTP_TYPES.has(typeParam) ? typeParam : 'signup'
  const next = safeRedirectPath(searchParams.get('next'))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const attemptedRef = useRef(false)

  // Verify email links as soon as their landing page is opened. Recovery
  // confirmations still run through the server route so the HTTP-only
  // `cf_recovery` cookie can be set before /update-password renders.
  useEffect(() => {
    if (!tokenHash || attemptedRef.current) return
    attemptedRef.current = true
    if (type === 'recovery') {
      const url = new URL('/auth/recovery-confirm', window.location.origin)
      url.searchParams.set('token_hash', tokenHash)
      window.location.replace(url.toString())
      return
    }
    void handleConfirm()
  // The token URL is a one-time landing action; handleConfirm intentionally
  // runs only once for that URL and handles its own state changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, tokenHash])

  async function handleConfirm() {
    if (!tokenHash) return
    setLoading(true)
    setError(null)
    const supabase = createClient()
    // If a different user is currently signed in on this browser, sign them
    // out before verifying the OTP. Otherwise the session silently swaps
    // (e.g. shared family device, mirrored inbox) without any user-facing
    // indication that the account context has changed. Defense-in-depth: the
    // recovery-AAL gate on /update-password closes the takeover path; this
    // makes the swap explicit.
    const { data: { user: existingUser } } = await supabase.auth.getUser()
    if (existingUser) {
      clearClientStateOnAuthChange()
      await supabase.auth.signOut()
    }
    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'signup' | 'email' | 'invite' | 'recovery' | 'email_change',
    })
    if (otpError) {
      // Scrub Supabase error text so we don't expose specific token states
      // (expired vs not found) that could fingerprint signed-up addresses.
      setError('This confirmation link is invalid or has expired. Please request a new one.')
      setLoading(false)
      return
    }
    window.location.href = next
  }

  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-8 max-w-sm w-full text-center">
      <div className="w-12 h-12 rounded-full bg-[#1B6FD9]/15 flex items-center justify-center mx-auto mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B6FD9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      </div>
      <h1 className="text-lg font-semibold text-[#F5F5F2] mb-2">
        {type === 'recovery' ? 'Confirm your password reset' : 'Confirm your email'}
      </h1>
      {tokenHash && !error ? (
        <p role="status" className="text-sm text-[rgba(245,245,242,0.55)]">
          {type === 'recovery' ? 'Continuing to reset your password...' : loading ? 'Confirming your email...' : 'Preparing confirmation...'}
        </p>
      ) : !tokenHash ? (
        <p className="text-sm text-red-400">This link is missing a confirmation token. Please request a new one.</p>
      ) : null}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-8 max-w-sm w-full text-center">
          <p className="text-sm text-[rgba(245,245,242,0.55)]">Loading...</p>
        </div>
      }>
        <ConfirmContent />
      </Suspense>
    </div>
  )
}
