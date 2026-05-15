'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [loading, setLoading] = useState(false)

  function handleVerify() {
    if (!token) return
    setLoading(true)
    // Navigate to the API confirm route - token is consumed only on this explicit click,
    // not by Outlook Safe Links or other email scanners that pre-fetch the page.
    window.location.href = `/api/student-email/confirm?token=${encodeURIComponent(token)}`
  }

  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-8 max-w-sm w-full text-center">
      <div className="w-12 h-12 rounded-full bg-[#1B6FD9]/15 flex items-center justify-center mx-auto mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B6FD9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.46 2 2 0 0 1 3.57 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 16l.42.92z" />
        </svg>
      </div>
      <h1 className="text-lg font-semibold text-[#F5F5F2] mb-2">Verify your institutional email</h1>
      <p className="text-sm text-[rgba(245,245,242,0.55)] mb-6">
        Click the button below to confirm your institutional email address and activate your Student or Foundation tier access.
      </p>
      {token ? (
        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
        >
          {loading ? 'Verifying...' : 'Verify institutional email'}
        </button>
      ) : (
        <p className="text-sm text-red-400">This link is missing a verification token. Please request a new one from Settings.</p>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-8 max-w-sm w-full text-center">
          <p className="text-sm text-[rgba(245,245,242,0.55)]">Loading...</p>
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  )
}
