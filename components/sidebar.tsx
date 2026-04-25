'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/toast-provider'
import { useSearch } from '@/app/(dashboard)/providers'

type Profile = {
  first_name: string | null
  last_name: string | null
}

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/portfolio',
    label: 'Portfolio',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: '/cases',
    label: 'Cases',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12h6m-3-3v6M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" />
      </svg>
    ),
  },
  {
    href: '/specialties',
    label: 'Specialties',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    href: '/export',
    label: 'Export',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
  {
    href: '/insights',
    label: 'Insights',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    href: '/goals',
    label: 'Goals',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
      </svg>
    ),
  },
]

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedback, setFeedback] = useState({ name: '', email: '', comment: '' })
  const [feedbackSending, setFeedbackSending] = useState(false)
  const { addToast } = useToast()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { openSearch } = useSearch()
  const [isMac, setIsMac] = useState(true) // default true to match SSR (most devs on Mac; avoids hydration mismatch)
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPod|iPad/.test(navigator.platform))
  }, [])

const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Your Account'
  const initials = [profile.first_name?.[0], profile.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?'

  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    // Clear client-side draft storage so clinical notes don't linger after logout.
    localStorage.removeItem('clinidex-case-draft')
    sessionStorage.removeItem('clinidex-entry-draft')
    // Tell the service worker to drop its cache so authenticated pages aren't
    // served offline after the user logs out.
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' })
    }
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedbackSending(true)

    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback),
    })

    if (res.ok) {
      setFeedback({ name: '', email: '', comment: '' })
      setFeedbackOpen(false)
      addToast('Feedback sent — thank you!', 'success')
    } else {
      addToast('Failed to send feedback. Please try again.', 'error')
    }
    setFeedbackSending(false)
  }

  return (
    <>
      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[#0E0E10] border-b border-white/[0.06] flex items-center justify-between px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] transition-colors p-1"
          aria-label="Open menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #3884DD 0%, #155BB0 100%)' }}>
            <svg viewBox="0 0 64 64" width="18" height="18" fill="none">
              <rect x="8" y="32" width="9" height="24" rx="1.6" fill="#0A3260" fillOpacity="0.85" />
              <rect x="20" y="26" width="9" height="30" rx="1.6" fill="#0A3260" fillOpacity="0.9" />
              <rect x="32" y="20" width="9" height="36" rx="1.6" fill="#0A3260" fillOpacity="0.95" />
              <rect x="44" y="12" width="14" height="44" rx="2.4" fill="#EAF2FC" />
              <path d="M48 34 L52 38 L56 28" stroke="#155BB0" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-[#F5F5F2] font-semibold text-[15px] tracking-tight">Clinidex</span>
        </div>
        <div className="w-8" />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`w-[240px] h-screen bg-[#0E0E10] border-r border-white/[0.06] flex flex-col flex-shrink-0 fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between border-b border-white/[0.06]">
        <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-5 py-5 hover:opacity-80 transition-opacity flex-1">
          <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #3884DD 0%, #155BB0 100%)' }}>
            <svg viewBox="0 0 64 64" width="18" height="18" fill="none">
              <rect x="8" y="32" width="9" height="24" rx="1.6" fill="#0A3260" fillOpacity="0.85" />
              <rect x="20" y="26" width="9" height="30" rx="1.6" fill="#0A3260" fillOpacity="0.9" />
              <rect x="32" y="20" width="9" height="36" rx="1.6" fill="#0A3260" fillOpacity="0.95" />
              <rect x="44" y="12" width="14" height="44" rx="2.4" fill="#EAF2FC" />
              <path d="M48 34 L52 38 L56 28" stroke="#155BB0" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-[#F5F5F2] font-semibold text-[15px] tracking-tight">Clinidex</span>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden mr-4 text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors p-1"
          aria-label="Close menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto flex flex-col">
          <div className="space-y-0.5">
            {NAV_ITEMS.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors relative ${
                    active
                      ? 'rounded-r-lg text-[#F5F5F2] border-l-2 border-blue-400'
                      : 'rounded-lg text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] hover:bg-white/[0.05]'
                  }`}
                  style={active ? { background: 'rgba(27,111,217,0.12)' } : undefined}
                >
                  <span className={active ? 'text-blue-300' : 'text-[rgba(245,245,242,0.4)]'}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* Search hint */}
          <div className="mt-auto pt-3">
            <button
              onClick={() => { openSearch(); setMobileOpen(false) }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[rgba(245,245,242,0.35)] hover:text-[rgba(245,245,242,0.55)] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <span className="flex-1 text-left text-xs">Search</span>
              <kbd className="text-[9px] bg-white/[0.06] px-1 py-0.5 rounded border border-white/[0.08]">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
            </button>
          </div>
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-4 space-y-0.5 border-t border-white/[0.06] pt-3">
          {/* Send Feedback */}
          <button
            onClick={() => setFeedbackOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] hover:bg-white/[0.05] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Send feedback
          </button>

          {/* Log out */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] hover:bg-white/[0.05] transition-colors disabled:opacity-50"
          >
            {loggingOut ? (
              <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin flex-shrink-0" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            )}
            {loggingOut ? 'Signing out…' : 'Log out'}
          </button>

          {/* Import */}
          <Link
            href="/import"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors relative ${
              pathname === '/import'
                ? 'rounded-r-lg text-[#F5F5F2] border-l-2 border-blue-400'
                : 'rounded-lg text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] hover:bg-white/[0.05]'
            }`}
            style={pathname === '/import' ? { background: 'rgba(27,111,217,0.12)' } : undefined}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import
          </Link>

          {/* Trash */}
          <Link
            href="/trash"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors relative ${
              pathname === '/trash'
                ? 'rounded-r-lg text-[#F5F5F2] border-l-2 border-blue-400'
                : 'rounded-lg text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] hover:bg-white/[0.05]'
            }`}
            style={pathname === '/trash' ? { background: 'rgba(27,111,217,0.12)' } : undefined}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
            Trash
          </Link>

          {/* Settings */}
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors relative ${
              pathname === '/settings'
                ? 'rounded-r-lg text-[#F5F5F2] border-l-2 border-blue-400'
                : 'rounded-lg text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] hover:bg-white/[0.05]'
            }`}
            style={pathname === '/settings' ? { background: 'rgba(27,111,217,0.12)' } : undefined}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </Link>

          {/* User name */}
          <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-semibold flex-shrink-0">
              {initials}
            </div>
            <span className="text-sm text-[rgba(245,245,242,0.6)] truncate font-medium">{fullName}</span>
          </div>
        </div>
      </aside>

      {/* Feedback modal */}
      {feedbackOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#F5F5F2]">Send feedback</h2>
              <button
                onClick={() => setFeedbackOpen(false)}
                className="text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">Your name</label>
                  <input
                    required
                    value={feedback.name}
                    onChange={e => setFeedback(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Dr Jane Smith"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">Email</label>
                  <input
                    type="email"
                    required
                    value={feedback.email}
                    onChange={e => setFeedback(f => ({ ...f, email: e.target.value }))}
                    className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">Comment</label>
                  <textarea
                    required
                    rows={4}
                    value={feedback.comment}
                    onChange={e => setFeedback(f => ({ ...f, comment: e.target.value }))}
                    className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    placeholder="Tell us what's working, what isn't, or what you'd love to see…"
                  />
                </div>
                <button
                  type="submit"
                  disabled={feedbackSending}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
                >
                  {feedbackSending ? 'Sending…' : 'Send feedback'}
                </button>
              </form>
          </div>
        </div>
      )}
    </>
  )
}
