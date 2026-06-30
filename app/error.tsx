'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Unhandled error:', error.digest ?? error.message)
  }, [error])

  return (
    <div style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)', minHeight: '100vh', fontFamily: '"Inter", -apple-system, system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)', letterSpacing: 1.5, marginBottom: 24 }}>ERROR · UNEXPECTED</div>
      <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 500, letterSpacing: -2, margin: 0, marginBottom: 20, lineHeight: 1, textAlign: 'center' }}>
        Something went{' '}
        <span style={{ background: 'var(--danger-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontStyle: 'italic', fontWeight: 400 }}>
          wrong.
        </span>
      </h1>
      <p style={{ fontSize: 17, color: 'var(--text-secondary)', maxWidth: 440, textAlign: 'center', lineHeight: 1.6, marginBottom: 40 }}>
        An unexpected error occurred. Your data is safe - please try again or return to the dashboard.
      </p>
      {error.digest && (
        <p style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 32, letterSpacing: 1 }}>
          Error reference: {error.digest}
        </p>
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={reset}
          style={{ background: 'var(--button-primary-bg)', color: 'var(--button-primary-text)', padding: '12px 24px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          Try again
        </button>
        <Link href="/dashboard" style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid rgba(245,245,242,0.15)', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
