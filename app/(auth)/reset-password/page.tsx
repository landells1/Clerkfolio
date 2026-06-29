'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const preflight = await fetch('/api/auth/preflight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    })
    if (preflight.status === 429) {
      setError('Too many password reset attempts from this network. Please wait an hour and try again.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    })

    if (error) {
      console.error('Password reset failed:', error.code ?? error.name ?? 'auth_error')
      setError('We could not process that reset request. Check the email address and try again.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B6FD9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Check your email</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          If a confirmed account exists for <strong className="text-[var(--text-primary)]">{email}</strong>, we&apos;ll send a password reset link.
          Check your inbox and follow the latest link.
        </p>
        <Link href="/login" className="text-sm text-[var(--accent-text)] hover:text-[var(--accent-text)] transition-colors">
          ← Back to login
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-8">
      <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-1">Reset your password</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label htmlFor="reset-email" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
            Email address
          </label>
          <input
            id="reset-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="you@example.com"
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
        <Link href="/login" className="text-[var(--accent-text)] hover:text-[var(--accent-text)] transition-colors">
          ← Back to login
        </Link>
      </p>
    </div>
  )
}
