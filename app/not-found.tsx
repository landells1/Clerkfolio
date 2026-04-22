import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '404 — Page not found · Clinidex',
}

export default function NotFound() {
  return (
    <div style={{ background: '#0B0B0C', color: '#F5F5F2', minHeight: '100vh', fontFamily: '"Inter", -apple-system, system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(245,245,242,0.35)', letterSpacing: 1.5, marginBottom: 24 }}>§ 404 · NOT FOUND</div>
      <h1 style={{ fontSize: 'clamp(48px, 8vw, 96px)', fontWeight: 500, letterSpacing: -3, margin: 0, marginBottom: 20, lineHeight: 1 }}>
        Lost in the{' '}
        <span style={{ background: 'linear-gradient(100deg, oklch(0.82 0.13 195) 0%, oklch(0.7 0.13 250) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontStyle: 'italic', fontWeight: 400 }}>
          index.
        </span>
      </h1>
      <p style={{ fontSize: 18, color: 'rgba(245,245,242,0.55)', maxWidth: 480, textAlign: 'center', lineHeight: 1.6, marginBottom: 40 }}>
        This page doesn&apos;t exist. It may have moved, or you may have followed a broken link.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link href="/" style={{ background: 'oklch(0.82 0.13 195)', color: '#0B0B0C', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
          Back to home
        </Link>
        <Link href="/dashboard" style={{ background: 'transparent', color: '#F5F5F2', border: '1px solid rgba(245,245,242,0.15)', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
