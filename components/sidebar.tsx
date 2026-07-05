'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { useSearch } from '@/app/(dashboard)/providers'
import { clearClientStateOnAuthChange } from '@/lib/client-cleanup'
import { NotificationBellSidebar, NotificationBellMobile } from '@/components/notification-bell'
import { FeedbackModal } from '@/components/feedback-modal'

type Profile = {
  first_name: string | null
  last_name: string | null
  career_stage: string | null
  tier?: string | null
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
    href: '/logs',
    label: 'Rotations & training',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 6h13M8 12h13M8 18h13" />
        <path d="M3 6h.01M3 12h.01M3 18h.01" />
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
    label: 'Import & export',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
  {
    href: '/trash',
    label: 'Trash',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </svg>
    ),
  },
]

export function getNavItemsForStage(careerStage: string | null) {
  const showArcp = careerStage === 'FY1' || careerStage === 'FY2'
  return NAV_ITEMS.filter(item => showArcp || item.href !== '/arcp')
}

// Bottom nav icons (mobile, max 5)
const BOTTOM_ICONS = {
  home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  portfolio: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  cases: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12h6m-3-3v6M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" />
    </svg>
  ),
  timeline: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  specialties: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  arcp: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
}

// Stage-adaptive bottom nav: FY1/FY2 doctors get ARCP, everyone else gets Specialties.
function getBottomNavItems(careerStage: string | null) {
  const isFoundation = careerStage === 'FY1' || careerStage === 'FY2'
  return [
    { href: '/dashboard', label: 'Home', icon: BOTTOM_ICONS.home },
    { href: '/portfolio', label: 'Portfolio', icon: BOTTOM_ICONS.portfolio },
    { href: '/cases', label: 'Cases', icon: BOTTOM_ICONS.cases },
    { href: '/timeline', label: 'Timeline', icon: BOTTOM_ICONS.timeline },
    isFoundation
      ? { href: '/arcp', label: 'ARCP', icon: BOTTOM_ICONS.arcp }
      : { href: '/specialties', label: 'Specialties', icon: BOTTOM_ICONS.specialties },
  ]
}

export default function Sidebar({ profile, userEmail = '' }: { profile: Profile; userEmail?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const prefillName = [profile.first_name, profile.last_name].filter(Boolean).join(' ')
  const [mobileOpen, setMobileOpen] = useState(false)
  const { openSearch } = useSearch()
  // Avoid hydration mismatch flicker when the SSR-assumed platform doesn't match
  // the client. We render no shortcut hint until the component has mounted.
  const [platformHint, setPlatformHint] = useState<string | null>(null)
  useEffect(() => {
    // A keyboard-shortcut hint is meaningless on touch devices - and a phone or
    // iPad reports as "Mac-ish" via navigator.platform, so it wrongly showed
    // ⌘K there. Suppress the hint on coarse-pointer (touch) devices; search
    // stays reachable by tapping the button itself.
    if (window.matchMedia('(pointer: coarse)').matches) return
    const isMac = /Mac|iPhone|iPod|iPad/.test(navigator.platform)
    setPlatformHint(isMac ? '⌘K' : 'Ctrl K')
  }, [])

const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Your Account'
  const initials = [profile.first_name?.[0], profile.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?'
  const navItems = getNavItemsForStage(profile.career_stage)

  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    clearClientStateOnAuthChange()
    // Attempt a global sign-out (revokes refresh tokens on every device).
    // Supabase Auth can 503 or stall under load; if the global call errors or
    // doesn't return promptly we fall back to a best-effort local sign-out and
    // redirect with an explicit warning, so the button never appears to "do
    // nothing" and the user is told other sessions may still be valid (BUG-002).
    let globalOk = false
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('global-signout-timeout')), 4000)
      )
      const { error } = await Promise.race([
        supabase.auth.signOut({ scope: 'global' }),
        timeout,
      ])
      if (error) throw error
      globalOk = true
    } catch {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
    }
    router.replace(globalOk ? '/login' : '/login?logout=local')
    router.refresh()
  }

  return (
    <>
      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[var(--bg-canvas)] border-b border-subtle flex items-center justify-between px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-2 -ml-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
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
          <span className="text-[var(--text-primary)] font-semibold text-[15px] tracking-tight">Clerkfolio</span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/export"
            prefetch={false}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Share and export"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </Link>
          <button
            onClick={openSearch}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Search and commands"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <NotificationBellMobile />
        </div>
      </div>

      {/* Mobile bottom navigation bar - safe-area aware */}
      <nav aria-label="Mobile navigation" className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-1 border-t border-subtle flex items-center justify-around px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur">
        {getBottomNavItems(profile.career_stage).map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 py-1 px-3 min-w-[44px] min-h-[44px] justify-center rounded-lg transition-colors ${
                active ? 'text-[var(--accent-text)]' : 'text-fg-2'
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

      <aside className={`w-[240px] h-screen bg-[var(--bg-canvas)] border-r border-[var(--border-default)] flex flex-col flex-shrink-0 fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between border-b border-white/[0.06]">
        <Link href="/dashboard" prefetch={false} onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-5 py-5 hover:opacity-80 transition-opacity flex-1">
          <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #3884DD 0%, #155BB0 100%)' }}>
            <svg viewBox="0 0 64 64" width="18" height="18" fill="none">
              <rect x="8" y="32" width="9" height="24" rx="1.6" fill="#0A3260" fillOpacity="0.85" />
              <rect x="20" y="26" width="9" height="30" rx="1.6" fill="#0A3260" fillOpacity="0.9" />
              <rect x="32" y="20" width="9" height="36" rx="1.6" fill="#0A3260" fillOpacity="0.95" />
              <rect x="44" y="12" width="14" height="44" rx="2.4" fill="#EAF2FC" />
              <path d="M48 34 L52 38 L56 28" stroke="#155BB0" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-[var(--text-primary)] font-semibold text-[15px] tracking-tight">Clerkfolio</span>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden mr-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
          aria-label="Close menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        </div>

        {/* Main nav */}
        <nav aria-label="Main navigation" className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto flex flex-col">
          <div className="space-y-0.5">
            {navItems.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-bold transition-colors relative ${
                    active
                      ? 'rounded-r-lg text-[var(--text-primary)] border-l-2 border-[var(--nav-active-border)]'
                      : 'rounded-lg text-[var(--text-emphasis)] hover:text-[var(--text-primary)] hover:bg-white/[0.05]'
                  }`}
                  style={active ? { background: 'var(--nav-active-bg)' } : undefined}
                >
                  <span className={active ? 'text-[var(--accent-text)]' : 'text-[var(--text-emphasis)]'}>
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
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text-emphasis)] hover:text-[var(--text-primary)] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <span className="flex-1 text-left text-xs">Search</span>
              {platformHint && (
                <kbd className="text-[9px] bg-white/[0.06] px-1 py-0.5 rounded border border-white/[0.08]">{platformHint}</kbd>
              )}
            </button>
            <NotificationBellSidebar />
          </div>
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-4 space-y-0.5 border-t border-white/[0.06] pt-3">
          {/* Send Feedback */}
          <button
            onClick={() => setFeedbackOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold text-[var(--text-emphasis)] hover:text-[var(--text-primary)] hover:bg-white/[0.05] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Send feedback
          </button>

          {/* Upgrade link - hidden for Pro (Stripe is the only way to be Pro). */}
          {profile.tier !== 'pro' && (
            <Link
              href="/upgrade"
              prefetch={false}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-bold transition-colors relative ${
                pathname === '/upgrade'
                  ? 'rounded-r-lg text-[var(--text-primary)] border-l-2 border-[var(--nav-active-border)]'
                  : 'rounded-lg text-[var(--text-emphasis)] hover:text-[var(--text-primary)] hover:bg-white/[0.05]'
              }`}
              style={pathname === '/upgrade' ? { background: 'var(--nav-active-bg)' } : undefined}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              Upgrade
            </Link>
          )}

          {/* Log out */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold text-[var(--text-emphasis)] hover:text-[var(--text-primary)] hover:bg-white/[0.05] transition-colors disabled:opacity-50"
          >
            {loggingOut ? (
              <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full motion-safe:animate-spin flex-shrink-0" />
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
            prefetch={false}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 text-sm font-bold transition-colors relative ${
              pathname === '/settings' || pathname.startsWith('/settings/')
                ? 'rounded-r-lg text-[var(--text-primary)] border-l-2 border-[var(--nav-active-border)]'
                : 'rounded-lg text-[var(--text-emphasis)] hover:text-[var(--text-primary)] hover:bg-white/[0.05]'
            }`}
            style={(pathname === '/settings' || pathname.startsWith('/settings/')) ? { background: 'var(--nav-active-bg)' } : undefined}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </Link>

          {/* User name */}
          <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
            <div className="w-7 h-7 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent-soft-text)] text-xs font-semibold flex-shrink-0">
              {initials}
            </div>
            <span className="text-sm text-[var(--text-emphasis)] truncate font-bold">{fullName}</span>
          </div>

          {/* Legal links */}
          <div className="px-3 pt-2 pb-1 flex flex-wrap gap-x-2.5 gap-y-1 border-t border-white/[0.04] mt-1">
            {[
              ['Privacy', '/privacy'],
              ['Terms', '/terms'],
              ['Cookies', '/cookies'],
              ['DPA', '/dpa'],
              ['Security', '/security'],
              ['Contact', '/contact'],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                // Rarely-clicked legal pages. Prefetching all six on every
                // authenticated render fed the per-IP `?_rsc=` prefetch-burst
                // 503s during SPA navigation (BUG-001), the same reason the
                // logged-out legal footer disables prefetch.
                prefetch={false}
                onClick={() => setMobileOpen(false)}
                className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </aside>

      {/* Feedback modal */}
      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        prefillName={prefillName}
        userEmail={userEmail}
      />
    </>
  )
}
