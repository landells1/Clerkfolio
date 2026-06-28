'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { isProtectedPagePath } from '@/lib/auth/protected-paths'

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  const parsed = new URL(value, 'https://clerkfolio.local')
  // Allowlist mirrors middleware's protected-page list exactly (shared constant)
  // so a deep-link middleware bounced to login (e.g. ?next=/arcp) survives login.
  return isProtectedPagePath(parsed.pathname) ? `${parsed.pathname}${parsed.search}` : '/dashboard'
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const confirmationFailed = searchParams.get('error') === 'confirmation_failed'
  const recoveryFailed = confirmationFailed && searchParams.get('type') === 'recovery'
  const wrongAccountVerify = searchParams.get('verify') === 'wrong_account'
  const sessionRevoked = searchParams.get('session') === 'revoked'
  const localLogout = searchParams.get('logout') === 'local'
  const nextPath = safeNextPath(searchParams.get('next'))

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const preflight = await fetch('/api/auth/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email }),
      })
      if (preflight.status === 429) {
        setError('Too many login attempts for this account. Please wait an hour and try again.')
        return
      }
      if (!preflight.ok) {
        setError('Login is temporarily unavailable. Please try again.')
        return
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        // Always return a generic error so an attacker cannot probe whether
        // a given address is signed up but unconfirmed (vs not signed up at
        // all vs wrong password).
        setError('Incorrect email or password. Please try again.')
        return
      }

      router.push(nextPath)
      router.refresh()
    } catch {
      setError('Login is temporarily unavailable. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-8">
      <h1 className="text-xl font-semibold text-[#F5F5F2] mb-1">Welcome back</h1>
      <p className="text-sm text-[rgba(245,245,242,0.55)] mb-6">Log in to your Clerkfolio account</p>

      {confirmationFailed && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5 text-sm text-red-100 mb-4">
          {recoveryFailed
            ? 'This reset link has expired or is invalid. Please request a new password reset link.'
            : 'The confirmation link has expired or is invalid. Please sign up again or contact support.'}
        </div>
      )}

      {wrongAccountVerify && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3.5 py-2.5 text-sm text-amber-100 mb-4">
          That verification link belongs to a different Clerkfolio account. Sign in to the account that requested the link, then re-open the link from the email.
        </div>
      )}

      {sessionRevoked && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3.5 py-2.5 text-sm text-amber-100 mb-4">
          That session was revoked. Sign in again to continue.
        </div>
      )}

      {localLogout && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3.5 py-2.5 text-sm text-amber-100 mb-4">
          You have been signed out on this device. Other active sessions could not be revoked; change your password if you need to invalidate them.
        </div>
      )}

      {nextPath.startsWith('/upgrade') && (
        <div className="bg-[#1B6FD9]/10 border border-[#1B6FD9]/20 rounded-lg px-3.5 py-2.5 text-sm text-blue-100 mb-4">
          Log in to continue your Pro upgrade.
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.55)] focus:outline-none focus:border-[#1B6FD9] transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className="block text-xs font-medium text-[rgba(245,245,242,0.55)] uppercase tracking-wide">
              Password
            </label>
            <Link href="/reset-password" className="text-xs text-[#1B6FD9] hover:text-[#1B6FD9]/80 transition-colors">
              Forgot password?
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.55)] focus:outline-none focus:border-[#1B6FD9] transition-colors"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5 text-sm text-red-100">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-50 disabled:cursor-not-allowed text-[#0B0B0C] font-semibold rounded-lg py-2.5 text-sm transition-colors"
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="text-center text-sm text-[rgba(245,245,242,0.55)] mt-6">
        Don&apos;t have an account?{' '}
        <Link href={nextPath.startsWith('/upgrade') ? `/signup?next=${encodeURIComponent(nextPath)}` : '/signup'} className="text-[#1B6FD9] hover:text-[#1B6FD9]/80 transition-colors font-medium">
          Sign up free
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-8 text-center text-sm text-[rgba(245,245,242,0.55)]">Loading…</div>}>
      <LoginForm />
    </Suspense>
  )
}
