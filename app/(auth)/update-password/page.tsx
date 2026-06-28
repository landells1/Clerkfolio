'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { clearClientStateOnAuthChange } from '@/lib/client-cleanup'
import { apiFetch } from '@/lib/api-fetch'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    clearClientStateOnAuthChange()
  }, [])

  async function handleUpdate(e: React.FormEvent) {
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

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Record the reset in the audit log and send the "your password was
    // changed" alert email (F-038). Best-effort: apiFetch never throws, and a
    // failure here must not strand the user on this page after the password has
    // already changed - the redirect below still runs.
    await apiFetch('/api/account/password-reset-complete', { method: 'POST' })

    // Clear the short-lived recovery cookie so the route locks down again
    // immediately. Middleware checks for this cookie before rendering the
    // page; clearing it after a successful change prevents replay. apiFetch
    // never throws, so a network blip here can't strand the user on this
    // page after the password has already been changed - the cookie's short
    // TTL expires it regardless.
    await apiFetch('/api/auth/clear-recovery', { method: 'POST' })

    router.push('/dashboard?password=updated')
    router.refresh()
  }

  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-8">
      <h1 className="text-xl font-semibold text-[#F5F5F2] mb-1">Set new password</h1>
      <p className="text-sm text-[rgba(245,245,242,0.55)] mb-6">
        Choose a strong password for your account.
      </p>

      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">
            New password
          </label>
          <input
            id="new-password"
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
          <label htmlFor="confirm-new-password" className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">
            Confirm password
          </label>
          <input
            id="confirm-new-password"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.55)] focus:outline-none focus:border-[#1B6FD9] transition-colors"
            placeholder="••••••••"
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
          className="w-full bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-50 disabled:cursor-not-allowed text-[#0B0B0C] font-semibold rounded-lg py-2.5 text-sm transition-colors"
        >
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
