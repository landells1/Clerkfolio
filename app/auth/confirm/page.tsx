'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { clearClientStateOnAuthChange } from '@/lib/client-cleanup'
import { apiFetch } from '@/lib/api-fetch'

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
  const parsed = new URL(next, 'https://clerkfolio.local')
  if (parsed.pathname === '/onboarding') {
    const postOnboardingNext = parsed.searchParams.get('next')
    if (postOnboardingNext?.startsWith('/') && !postOnboardingNext.startsWith('//')) {
      const target = new URL(postOnboardingNext, 'https://clerkfolio.local')
      if (target.pathname === '/upgrade') {
        return `/onboarding?next=${encodeURIComponent(`${target.pathname}${target.search}`)}`
      }
    }
    return '/onboarding'
  }
  if (ALLOWED_NEXT_PATHS.has(parsed.pathname)) return `${parsed.pathname}${parsed.search}`
  for (const allowed of ALLOWED_NEXT_PATHS) {
    if (parsed.pathname.startsWith(allowed + '/')) return `${parsed.pathname}${parsed.search}`
  }
  return '/onboarding'
}

// email_change is enabled now that /api/account/email gates the change behind a
// current-password reauth (F-037). Confirming this OTP only completes a change
// the account owner already authorised; the auth.users.email swap then fires the
// audit + institutional-re-derivation triggers server-side.
const ALLOWED_OTP_TYPES = new Set(['signup', 'email', 'invite', 'recovery', 'email_change'])

function ConfirmContent() {
  const searchParams = useSearchParams()
  const tokenHash = searchParams.get('token_hash') ?? ''
  const typeParam = searchParams.get('type') ?? ''
  const type = ALLOWED_OTP_TYPES.has(typeParam) ? typeParam : 'signup'
  const next = safeRedirectPath(searchParams.get('next'))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingEmail, setExistingEmail] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (active) setExistingEmail(user?.email ?? null)
    })
    return () => {
      active = false
    }
  }, [])

  async function handleConfirm() {
    if (!tokenHash || loading) return
    setLoading(true)
    setError(null)
    if (type === 'recovery') {
      const url = new URL('/auth/recovery-confirm', window.location.origin)
      url.searchParams.set('token_hash', tokenHash)
      window.location.replace(url.toString())
      return
    }
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
    // An email change is fully re-derived server-side the moment auth.users.email
    // swaps (the audit + institutional triggers), so there's nothing to claim
    // here - just land back on settings. (With secure email change the user may
    // need to confirm from both inboxes; the toast says so.)
    if (type === 'email_change') {
      window.location.href = '/settings?email=changed'
      return
    }

    // Best-effort claim: a network failure here must not strand the user on
    // the confirm page after the OTP has already been consumed - the claim
    // re-runs from settings, so fall through to the redirect.
    const claimResponse = await apiFetch('/api/auth/claim-institutional-email', { method: 'POST' })
    if (claimResponse.status === 409) {
      const separator = next.includes('?') ? '&' : '?'
      window.location.href = `${next}${separator}student_email=conflict`
      return
    }
    window.location.href = next
  }

  return (
    <div className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-8 max-w-sm w-full text-center">
      <div className="w-12 h-12 rounded-full bg-[#1B6FD9]/15 flex items-center justify-center mx-auto mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B6FD9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      </div>
      <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
        {type === 'recovery' ? 'Confirm your password reset' : 'Confirm your email'}
      </h1>
      {tokenHash && !error ? (
        <>
          {existingEmail && (
            <p className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-left text-sm text-amber-100">
              You are currently signed in as {existingEmail}. Continuing will sign out this account
              {type === 'recovery' ? ' before resetting the password for the account linked in this email.' : ' before confirming the email link.'}
            </p>
          )}
          <p role="status" className="mb-5 text-sm text-[var(--text-secondary)]">
            {loading
              ? type === 'recovery' ? 'Continuing to reset your password...' : 'Confirming your email...'
              : type === 'recovery'
                ? 'Select continue to verify this password reset link.'
                : 'Select confirm to verify your email address.'}
          </p>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="min-h-[44px] w-full rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {type === 'recovery' ? 'Continue password reset' : 'Confirm email'}
          </button>
        </>
      ) : !tokenHash ? (
        <p className="text-sm text-red-400">This link is missing a confirmation token. Please request a new one.</p>
      ) : null}
      {error && (
        <>
          <p className="mb-5 text-sm text-red-400">{error} If you already confirmed your email, log in to continue.</p>
          <Link href="/login" className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white">
            Log in
          </Link>
        </>
      )}
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-8 max-w-sm w-full text-center">
          <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
        </div>
      }>
        <ConfirmContent />
      </Suspense>
    </div>
  )
}
