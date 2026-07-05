'use client'

import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { useFocusTrap } from '@/lib/hooks/use-focus-trap'

// Returns the unread count plus its setter so the bell can keep the badge in
// sync with the list: marking notifications read decrements/zeroes the badge
// in place instead of leaving a stale count until a full page reload.
function useUnreadCount(): [number, Dispatch<SetStateAction<number>>] {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const supabase = createBrowserClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { count: n } = await supabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('read', false)
        .limit(0)
      setCount(n ?? 0)
    }
    load()
  }, [])
  return [count, setCount]
}

export function NotificationBellSidebar() {
  return <NotificationBell className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold text-[var(--text-emphasis)] hover:text-[var(--text-primary)] hover:bg-white/[0.05] transition-colors" sidebar />
}

export function NotificationBellMobile() {
  return <NotificationBell className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" />
}

function NotificationBell({ className, sidebar }: { className: string; sidebar?: boolean }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useUnreadCount()
  const dropdownRef = useRef<HTMLDivElement>(null)
  useFocusTrap(open, dropdownRef, () => setOpen(false))

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
    setUnread(0)
  }

  async function handleMarkRead(id: string, link?: string | null) {
    const supabase = createBrowserClient()
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
    setUnread(c => Math.max(0, c - 1))
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
            <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </span>
        {sidebar && <span className="flex-1 text-left">Notifications</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            ref={dropdownRef}
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            tabIndex={-1}
            className={`fixed z-[9999] ${sidebar ? 'left-[248px] bottom-4' : 'right-4 top-14'} w-80 bg-[var(--bg-surface)] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <span className="text-sm font-semibold text-[var(--text-primary)]">Notifications</span>
              {notifications.length > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-[var(--accent-text)] hover:text-[var(--accent-bright)] transition-colors">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.04]">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full motion-safe:animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-[var(--text-secondary)]">All caught up.</p>
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
                        <p className="text-xs font-medium text-[var(--text-primary)] leading-snug">{n.title}</p>
                        {n.body && <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-snug">{n.body}</p>}
                        <p className="text-[10px] text-[var(--text-secondary)] mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />
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
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    </span>
  )
  if (type === 'share_link_expiring') return (
    <span className={`${cls} bg-amber-500/15`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--cat-amber-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
    </span>
  )
  return (
    <span className={`${cls} bg-accent/15`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--accent)' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
