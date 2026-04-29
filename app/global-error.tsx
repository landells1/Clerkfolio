'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0B0B0C', color: '#F5F5F2', fontFamily: '"Inter", -apple-system, system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(245,245,242,0.35)', letterSpacing: 1.5, marginBottom: 24 }}>
            § CRITICAL ERROR
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 500, letterSpacing: -2, margin: 0, marginBottom: 16, lineHeight: 1, textAlign: 'center' }}>
            Something went wrong.
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(245,245,242,0.55)', maxWidth: 400, textAlign: 'center', lineHeight: 1.6, marginBottom: 40 }}>
            A critical error occurred. Your data is safe — please refresh the page or contact{' '}
            <a href="mailto:hello@clerkfolio.co.uk" style={{ color: '#1B6FD9' }}>hello@clerkfolio.co.uk</a>{' '}
            if this keeps happening.
          </p>
          {error.digest && (
            <p style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(245,245,242,0.25)', marginBottom: 32, letterSpacing: 1 }}>
              Error reference: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{ background: '#1B6FD9', color: '#0B0B0C', padding: '12px 28px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
