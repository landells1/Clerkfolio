import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 mb-10 justify-center hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3884DD 0%, #155BB0 100%)' }}>
            <svg viewBox="0 0 64 64" width="20" height="20" fill="none">
              <rect x="8" y="32" width="9" height="24" rx="1.6" fill="#0A3260" fillOpacity="0.85" />
              <rect x="20" y="26" width="9" height="30" rx="1.6" fill="#0A3260" fillOpacity="0.9" />
              <rect x="32" y="20" width="9" height="36" rx="1.6" fill="#0A3260" fillOpacity="0.95" />
              <rect x="44" y="12" width="14" height="44" rx="2.4" fill="#EAF2FC" />
              <path d="M48 34 L52 38 L56 28" stroke="#155BB0" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-[var(--text-primary)] font-semibold text-lg tracking-tight">Clerkfolio</span>
        </Link>
        {children}
      </div>
    </div>
  )
}
