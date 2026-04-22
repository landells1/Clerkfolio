'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

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
]

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedback, setFeedback] = useState({ name: '', email: '', comment: '' })
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Your Account'
  const initials = [profile.first_name?.[0], profile.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?'

  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedbackStatus('sending')

    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback),
    })

    if (res.ok) {
      setFeedbackStatus('sent')
      setFeedback({ name: '', email: '', comment: '' })
    } else {
      setFeedbackStatus('error')
    }
  }

  return (
    <>
      <aside className="w-[240px] h-screen bg-[#0E0E10] border-r border-white/[0.06] flex flex-col flex-shrink-0 fixed left-0 top-0">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.06] hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 rounded-md bg-[#1D9E75] flex items-center justify-center text-[#0B0B0C] font-bold text-sm font-mono flex-shrink-0">
            C
          </div>
          <span className="text-[#F5F5F2] font-semibold text-[15px] tracking-tight">Clinidex</span>
        </Link>

        {/* Main nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#1D9E75]/15 text-[#1D9E75]'
                    : 'text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] hover:bg-white/[0.05]'
                }`}
              >
                <span className={active ? 'text-[#1D9E75]' : 'text-[rgba(245,245,242,0.4)]'}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            )
          })}
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

          {/* Settings */}
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/settings'
                ? 'bg-[#1D9E75]/15 text-[#1D9E75]'
                : 'text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] hover:bg-white/[0.05]'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </Link>

          {/* User name */}
          <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
            <div className="w-7 h-7 rounded-full bg-[#1D9E75]/20 flex items-center justify-center text-[#1D9E75] text-xs font-semibold flex-shrink-0">
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
                onClick={() => { setFeedbackOpen(false); setFeedbackStatus('idle') }}
                className="text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {feedbackStatus === 'sent' ? (
              <div className="text-center py-4">
                <div className="w-10 h-10 rounded-full bg-[#1D9E75]/15 flex items-center justify-center mx-auto mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-sm text-[rgba(245,245,242,0.55)]">Thanks for the feedback! We read every message.</p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">Your name</label>
                  <input
                    required
                    value={feedback.name}
                    onChange={e => setFeedback(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1D9E75] transition-colors"
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
                    className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1D9E75] transition-colors"
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
                    className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1D9E75] transition-colors resize-none"
                    placeholder="Tell us what's working, what isn't, or what you'd love to see…"
                  />
                </div>
                {feedbackStatus === 'error' && (
                  <p className="text-sm text-red-400">Something went wrong. Please try again.</p>
                )}
                <button
                  type="submit"
                  disabled={feedbackStatus === 'sending'}
                  className="w-full bg-[#1D9E75] hover:bg-[#178060] disabled:opacity-50 text-[#0B0B0C] font-semibold rounded-lg py-2.5 text-sm transition-colors"
                >
                  {feedbackStatus === 'sending' ? 'Sending…' : 'Send feedback'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
