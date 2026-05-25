'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { isAcUkEmail, isNhsEmail } from '@/lib/institutional-email'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const [referralInput, setReferralInput] = useState<string>(() =>
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('ref')?.trim().toUpperCase() ?? ''
      : ''
  )
  const router = useRouter()
  const supabase = createClient()
  const referralCode = referralInput.trim().toUpperCase() || null

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    try {
      const preflight = await fetch('/api/auth/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signup' }),
      })
      if (preflight.status === 429) {
        setError('Too many sign-up attempts from this network. Please wait an hour and try again.')
        return
      }
      if (!preflight.ok) {
        setError('Sign up is temporarily unavailable. Please try again.')
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          data: {
            referral_code: referralCode?.match(/^[A-Z]{5}$/) ? referralCode : null,
          },
        },
      })

      if (error) {
        console.error('Signup failed:', error.code ?? error.name ?? 'auth_error')
        setError('We could not create an account with those details. Check the form and try again.')
        return
      }

      // If session is null, Supabase requires email confirmation first
      if (!data.session) {
        setAwaitingConfirmation(true)
        return
      }

      // The referral code travels via raw_user_meta_data and is resolved
      // server-side in handle_new_user (sets profiles.referred_by) and in the
      // auth/callback OAuth flow.
      router.push('/onboarding')
      router.refresh()
    } catch {
      setError('Sign up is temporarily unavailable. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (awaitingConfirmation) {
    return (
      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-[#1B6FD9]/15 flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B6FD9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-[#F5F5F2] mb-2">Check your email</h2>
        <p className="text-sm text-[rgba(245,245,242,0.55)] mb-6">
          We&apos;ve sent a confirmation link to <strong className="text-[#F5F5F2]">{email}</strong>.
          Click the link to activate your account and continue.
        </p>
        <p className="text-xs text-[rgba(245,245,242,0.55)]">
          Didn&apos;t get it? Check your spam folder.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-8">
      <h1 className="text-xl font-semibold text-[#F5F5F2] mb-1">Create your account</h1>
      <p className="text-sm text-[rgba(245,245,242,0.55)] mb-6">
        Free to start. No credit card required.
      </p>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label htmlFor="signup-email" className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">
            Email address
          </label>
          <input
            id="signup-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.55)] focus:outline-none focus:border-[#1B6FD9] transition-colors"
            placeholder="you@example.com"
          />
          {/* Inline institutional-email detection: lights up when an .ac.uk or
              NHS email is entered, hinting at the Student / Foundation tier
              before the user even submits. Cosmetic only - actual tier is
              granted post-verification. Uses the same validators as the server
              so client and server tier-hints agree. */}
          {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (() => {
            const lower = email.toLowerCase()
            const isAcUk = isAcUkEmail(lower)
            const isNhs = isNhsEmail(lower)
            if (!isAcUk && !isNhs) return null
            return (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded text-[11px] px-2 py-0.5 border border-pill-green bg-pill-green text-green-300">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                {isAcUk ? 'Student email - eligible for Student tier after verification' : 'NHS email - eligible for Foundation tier after verification'}
              </div>
            )
          })()}
        </div>

        <div>
          <label htmlFor="signup-password" className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.55)] focus:outline-none focus:border-[#1B6FD9] transition-colors"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label htmlFor="signup-confirm-password" className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">
            Confirm password
          </label>
          <input
            id="signup-confirm-password"
            type="password"
            required
            autoComplete="off"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.55)] focus:outline-none focus:border-[#1B6FD9] transition-colors"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label htmlFor="signup-referral-code" className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">
            Referral code <span className="normal-case text-[rgba(245,245,242,0.35)]">(optional)</span>
          </label>
          <div className="relative">
            <input
              id="signup-referral-code"
              type="text"
              autoComplete="off"
              value={referralInput}
              onChange={e => setReferralInput(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5))}
              className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.35)] focus:outline-none focus:border-[#1B6FD9] transition-colors pr-24 tracking-widest"
              placeholder="XXXXX"
              maxLength={5}
            />
            {referralInput.length === 5 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-green-400">
                Will apply if valid
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-50 disabled:cursor-not-allowed text-[#0B0B0C] font-semibold rounded-lg py-2.5 text-sm transition-colors"
        >
          {loading ? 'Creating account…' : 'Create account →'}
        </button>
      </form>

      <p className="text-center text-xs text-[rgba(245,245,242,0.55)] mt-5 leading-relaxed">
        By signing up you agree to our{' '}
        <Link href="/terms" className="text-[rgba(245,245,242,0.55)] hover:text-[rgba(245,245,242,0.8)] underline transition-colors">Terms of Service</Link> and{' '}
        <Link href="/privacy" className="text-[rgba(245,245,242,0.55)] hover:text-[rgba(245,245,242,0.8)] underline transition-colors">Privacy Policy</Link>.
      </p>

      <p className="text-center text-sm text-[rgba(245,245,242,0.55)] mt-4">
        Already have an account?{' '}
        <Link href="/login" className="text-[#1B6FD9] hover:text-[#1B6FD9]/80 transition-colors font-medium">
          Log in
        </Link>
      </p>
    </div>
  )
}
