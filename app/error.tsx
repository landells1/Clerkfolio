'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div style={{ background: '#0B0B0C', color: '#F5F5F2', minHeight: '100vh', fontFamily: '"Inter", -apple-system, system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(245,245,242,0.35)', letterSpacing: 1.5, marginBottom: 24 }}>§ ERROR · UNEXPECTED</div>
      <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 500, letterSpacing: -2, margin: 0, marginBottom: 20, lineHeight: 1, textAlign: 'center' }}>
        Something went{' '}
        <span style={{ background: 'linear-gradient(100deg, oklch(0.75 0.15 30) 0%, oklch(0.65 0.15 20) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontStyle: 'italic', fontWeight: 400 }}>
          wrong.
        </span>
      </h1>
      <p style={{ fontSize: 17, color: 'rgba(245,245,242,0.55)', maxWidth: 440, textAlign: 'center', lineHeight: 1.6, marginBottom: 40 }}>
        An unexpected error occurred. Your data is safe — please try again or return to the dashboard.
      </p>
      {error.digest && (
        <p style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(245,245,242,0.25)', marginBottom: 32, letterSpacing: 1 }}>
          Error reference: {error.digest}
        </p>
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={reset}
          style={{ background: 'oklch(0.82 0.13 195)', color: '#0B0B0C', padding: '12px 24px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          Try again
        </button>
        <Link href="/dashboard" style={{ background: 'transparent', color: '#F5F5F2', border: '1px solid rgba(245,245,242,0.15)', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
