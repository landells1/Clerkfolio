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

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-[#1D9E75]/15 flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-[#F5F5F2] mb-2">Check your email</h2>
        <p className="text-sm text-[rgba(245,245,242,0.55)] mb-6">
          We&apos;ve sent a password reset link to <strong className="text-[#F5F5F2]">{email}</strong>.
          Check your inbox and follow the link.
        </p>
        <Link href="/login" className="text-sm text-[#1D9E75] hover:text-[#1D9E75]/80 transition-colors">
          ← Back to login
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-8">
      <h1 className="text-xl font-semibold text-[#F5F5F2] mb-1">Reset your password</h1>
      <p className="text-sm text-[rgba(245,245,242,0.55)] mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">
            Email address
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1D9E75] transition-colors"
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
          className="w-full bg-[#1D9E75] hover:bg-[#178060] disabled:opacity-50 disabled:cursor-not-allowed text-[#0B0B0C] font-semibold rounded-lg py-2.5 text-sm transition-colors"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="text-center text-sm text-[rgba(245,245,242,0.35)] mt-6">
        <Link href="/login" className="text-[#1D9E75] hover:text-[#1D9E75]/80 transition-colors">
          ← Back to login
        </Link>
      </p>
    </div>
  )
}
