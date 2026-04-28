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
  career_stage: string | null
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
    href: '/arcp',
    label: 'ARCP',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
  },
  {
    href: '/timeline',
    label: 'Timeline',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </svg>
    ),
  },
  {
    href: '/export',
    label: 'Share & Export',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
]

export function getNavItemsForStage(careerStage: string | null) {
  const showArcp = careerStage === 'FY1' || careerStage === 'FY2'
  return NAV_ITEMS.filter(item => showArcp || item.href !== '/arcp')
}

// Bottom nav items — max 5, primary mobile destinations
const BOTTOM_NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/portfolio',
    label: 'Portfolio',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: '/cases',
    label: 'Cases',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12h6m-3-3v6M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" />
      </svg>
    ),
  },
  {
    href: '/timeline',
    label: 'Timeline',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
  const navItems = getNavItemsForStage(profile.career_stage)

  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    // Clear client-side draft storage so clinical notes don't linger after logout.
    sessionStorage.removeItem('clinidex-case-draft')
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
          className="text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] transition-colors p-2 -ml-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
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
        <NotificationBellMobile />
      </div>

      {/* Mobile bottom navigation bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-[#0E0E10] border-t border-white/[0.06] flex items-center justify-around px-2">
        {BOTTOM_NAV_ITEMS.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 min-w-[44px] min-h-[44px] justify-center rounded-xl transition-colors ${
                active ? 'text-[#1B6FD9]' : 'text-[rgba(245,245,242,0.45)]'
              }`}
            >
              <span className="w-5 h-5 flex items-center justify-center">{item.icon}</span>
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          )
        })}
      </nav>

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
            {navItems.map(item => {
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
          <div className="mt-auto pt-3 space-y-0.5">
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
            <NotificationBellSidebar />
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

          {/* Settings */}
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors relative ${
              pathname === '/settings' || pathname.startsWith('/settings/')
                ? 'rounded-r-lg text-[#F5F5F2] border-l-2 border-blue-400'
                : 'rounded-lg text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] hover:bg-white/[0.05]'
            }`}
            style={(pathname === '/settings' || pathname.startsWith('/settings/')) ? { background: 'rgba(27,111,217,0.12)' } : undefined}
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

// ---------- Notification Bell (shared logic) ----------

import { createClient as createBrowserClient } from '@/lib/supabase/client'

function useUnreadCount() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const supabase = createBrowserClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { count: n } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
      setCount(n ?? 0)
    }
    load()
  }, [])
  return count
}

function NotificationBellSidebar() {
  return <NotificationBell className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] hover:bg-white/[0.05] transition-colors" sidebar />
}

function NotificationBellMobile() {
  return <NotificationBell className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] transition-colors" />
}

function NotificationBell({ className, sidebar }: { className: string; sidebar?: boolean }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const unread = useUnreadCount()

  async function handleOpen() {
    setOpen(v => !v)
    if (!open) {
      setLoading(true)
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(30)
      setNotifications((data ?? []) as Notification[])
      setLoading(false)
    }
  }

  async function handleMarkAllRead() {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications([])
  }

  async function handleMarkRead(id: string, link?: string | null) {
    const supabase = createBrowserClient()
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
    if (link) window.location.href = link
  }

  return (
    <div className="relative">
      <button onClick={handleOpen} className={className} aria-label="Notifications">
        <span className="relative flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </span>
        {sidebar && <span className="flex-1 text-left">Notifications</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={`absolute z-50 ${sidebar ? 'left-full ml-2 bottom-0' : 'right-0 top-full mt-2'} w-80 bg-[#141416] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <span className="text-sm font-semibold text-[#F5F5F2]">Notifications</span>
              {notifications.length > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-[#1B6FD9] hover:text-[#3884DD] transition-colors">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.04]">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-4 h-4 border-2 border-[#1B6FD9] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-[rgba(245,245,242,0.35)]">No unread notifications</p>
                </div>
              ) : (
                notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleMarkRead(n.id, n.link)}
                    className="w-full text-left px-4 py-3 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <NotifIcon type={n.type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#F5F5F2] leading-snug">{n.title}</p>
                        {n.body && <p className="text-xs text-[rgba(245,245,242,0.45)] mt-0.5 leading-snug">{n.body}</p>}
                        <p className="text-[10px] text-[rgba(245,245,242,0.3)] mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1B6FD9] mt-1.5 shrink-0" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

type Notification = { id: string; type: string; title: string; body: string | null; link: string | null; created_at: string }

function NotifIcon({ type }: { type: string }) {
  const cls = "w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
  if (type === 'deadline_due') return (
    <span className={`${cls} bg-red-500/15`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    </span>
  )
  if (type === 'share_link_expiring') return (
    <span className={`${cls} bg-amber-500/15`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
    </span>
  )
  return (
    <span className={`${cls} bg-[#1B6FD9]/15`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1B6FD9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </span>
  )
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
