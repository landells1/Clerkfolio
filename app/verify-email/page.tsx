'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const attemptedRef = useRef(false)

  useEffect(() => {
    if (!token || attemptedRef.current) return
    attemptedRef.current = true
    void handleVerify()
  // Submit exactly once when a user opens this token landing page. The POST
  // route still checks the authenticated owner before consuming any token.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleVerify() {
    if (!token) return
    setLoading(true)
    setError(null)
    // Keep confirmation as POST: link-preview GET requests cannot consume a
    // token, and the route rejects requests without the owning auth session.
    try {
      const res = await fetch('/api/student-email/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const body = await res.json().catch(() => ({}))
      const status = body?.status ?? (res.ok ? 'verified' : 'invalid')
      // Wrong-account flow: confirm route did NOT consume the token because
      // the current browser session is logged in as a different user than
      // the token's owner. Sign the current user out and bounce to login so
      // they can sign in as the right account and re-open the link.
      if (status === 'wrong_account') {
        try {
          const supabase = createClient()
          await supabase.auth.signOut()
        } catch {}
        router.push('/login?verify=wrong_account')
        router.refresh()
        return
      }
      const target = `/settings?student_email=${encodeURIComponent(status)}`
      router.push(target)
      router.refresh()
    } catch {
      setError('Could not reach the verification service. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-8 max-w-sm w-full text-center">
      <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center mx-auto mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--accent)' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.46 2 2 0 0 1 3.57 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 16l.42.92z" />
        </svg>
      </div>
      <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Verify your institutional email</h1>
      {token && !error ? (
        <p role="status" className="text-sm text-[var(--text-secondary)]">
          {loading ? 'Verifying your institutional email...' : 'Preparing verification...'}
        </p>
      ) : !token ? (
        <p className="text-sm text-red-400">This link is missing a verification token. Please request a new one from Settings.</p>
      ) : (
        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--button-primary-text)] font-semibold rounded-lg py-2.5 text-sm transition-colors mt-4"
        >
          {loading ? 'Retrying...' : 'Try again'}
        </button>
      )}
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-8 max-w-sm w-full text-center">
          <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  )
}
