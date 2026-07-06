'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/lib/types/portfolio'
import { useToast } from '@/components/ui/toast-provider'
import { localIsoDate, monthGridDays } from '@/lib/timeline/calendar-grid'
import { apiFetch, NETWORK_ERROR_MESSAGE } from '@/lib/api-fetch'

export type TimelineGoal = {
  id: string
  category: string
  target_count: number
  due_date: string | null
  specialty_application_id: string | null
  specific: string | null
  measurable: string | null
  achievable: string | null
  relevant: string | null
  time_bound: string | null
  created_at: string
}

export type TimelineSpecialty = {
  id: string
  key: string
  name: string
}

export type TimelineSpecialtyDeadline = {
  id: string
  title: string
  date: string
  details?: string | null
  location?: string | null
  sourceUrl?: string | null
  sourceLabel?: string | null
  specialtyApplicationId: string | null
  specialtyKey: string | null
  specialtyName: string
  source: 'config' | 'table'
}

type TimelineItem = {
  id: string
  title: string
  date: string
  details: string | null
  location: string | null
  sourceUrl: string | null
  sourceLabel: string | null
  type: 'deadline' | 'goal'
  isAuto: boolean
  specialtyApplicationId: string | null
  specialtyName: string
}

const COLOURS = ['var(--cat-blue-dot)', 'var(--cat-cyan-dot)', 'var(--cat-teal-dot)', 'var(--cat-green-dot)', 'var(--cat-amber-dot)', 'var(--cat-red-dot)', 'var(--cat-violet-dot)', 'var(--cat-pink-dot)']

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`
}

// `iso` (local-component date string) and the month grid builder live in
// lib/timeline/calendar-grid so they are unit-tested and shared. Using local
// components rather than toISOString() keeps day matching timezone-stable
// across SSR/CSR (BUG-004 placement + BUG-010 hydration #418).
const iso = localIsoDate

export function TimelineClient({ goals, specialties, deadlines, calendarFeedExists, initialMonthIso, showNationalDefault, displayPrefs, filterBar, banner }: { goals: TimelineGoal[]; specialties: TimelineSpecialty[]; deadlines: TimelineSpecialtyDeadline[]; calendarFeedExists: boolean; initialMonthIso: string; showNationalDefault: boolean; displayPrefs: Record<string, unknown>; filterBar?: React.ReactNode; banner?: React.ReactNode }) {
  const supabase = createClient()
  const router = useRouter()
  const { addToast } = useToast()
  // SSR-safe defaults: matchMedia and Date() must not be called during render
  // because they return different values on server (no window) vs client (with
  // window + client clock), which triggers React hydration error #418.
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  // Gates mobile calendar visibility: pre-hydration the view defaults to
  // 'calendar', so without this the calendar grid would flash on mobile before
  // the effect below switches small screens to 'list'.
  const [mounted, setMounted] = useState(false)
  // initialMonthIso is computed once on the server and passed in, so SSR HTML
  // and the first client render see the same Date value even across midnight.
  const [month, setMonth] = useState<Date>(() => new Date(initialMonthIso))
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [showEventForm, setShowEventForm] = useState(false)
  const [goalForm, setGoalForm] = useState({
    category: 'custom',
    target_count: '1',
    due_date: '',
    specialty_application_id: '',
    specific: '',
    measurable: '',
    achievable: '',
    relevant: '',
    time_bound: '',
  })
  const [eventForm, setEventForm] = useState({ title: '', due_date: '', details: '', location: '', source_specialty_key: '' })

  // Today's date is only known safely on the client (SSR server clock can
  // disagree with the user's timezone - the BUG-004/BUG-010 class of issue), so
  // today-dependent decorations (today ring, overdue flags) appear post-mount.
  const [todayIso, setTodayIso] = useState<string | null>(null)

  // Fill in client-only defaults after hydration so SSR HTML and first client
  // render agree.
  useEffect(() => {
    setMounted(true)
    if (window.matchMedia('(max-width: 640px)').matches) setView('list')
    const today = iso(new Date())
    setTodayIso(today)
    setGoalForm(prev => prev.due_date ? prev : { ...prev, due_date: today })
    setEventForm(prev => prev.due_date ? prev : { ...prev, due_date: today })
  }, [])
  const [calendarToken, setCalendarToken] = useState<string | null>(null)
  const [hasCalendarFeed, setHasCalendarFeed] = useState(calendarFeedExists)
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null)
  const [selectedDayIso, setSelectedDayIso] = useState<string | null>(null)
  const [calendarFallbackUrl, setCalendarFallbackUrl] = useState<string | null>(null)
  const [syncMenuOpen, setSyncMenuOpen] = useState(false)
  const [showNational, setShowNational] = useState(showNationalDefault)

  const colourBySpecialty = useMemo(() => Object.fromEntries(specialties.map((specialty, index) => [specialty.id, COLOURS[index % COLOURS.length]])), [specialties])

  const items: TimelineItem[] = useMemo(() => {
    const goalItems = goals
      .filter(goal => goal.due_date)
      .map(goal => {
        const specialty = specialties.find(row => row.id === goal.specialty_application_id)
        return {
          id: `goal-${goal.id}`,
          title: goal.specific || `${goal.target_count} ${CATEGORIES.find(category => category.value === goal.category)?.label ?? goal.category}`,
          date: goal.due_date!,
          details: [goal.measurable, goal.achievable, goal.relevant, goal.time_bound].filter(Boolean).join('\n') || null,
          location: null,
          sourceUrl: null,
          sourceLabel: null,
          type: 'goal' as const,
          isAuto: false,
          specialtyApplicationId: goal.specialty_application_id,
          specialtyName: specialty?.name ?? 'Other',
        }
      })
    const deadlineItems = deadlines.map(deadline => ({
      id: `deadline-${deadline.id}`,
      title: deadline.title,
      date: deadline.date,
      details: deadline.details ?? null,
      location: deadline.location ?? null,
      sourceUrl: deadline.sourceUrl ?? null,
      sourceLabel: deadline.sourceLabel ?? null,
      type: 'deadline' as const,
      isAuto: deadline.source === 'config',
      specialtyApplicationId: deadline.specialtyApplicationId,
      specialtyName: deadline.specialtyName,
    }))
    return [...deadlineItems, ...goalItems].sort((a, b) => a.date.localeCompare(b.date))
  }, [deadlines, goals, specialties])

  // The server always sends the national NHS recruitment dates (isAuto items);
  // the tick filters them here so toggling is instant, then persists.
  const visibleItems = useMemo(
    () => (showNational ? items : items.filter(item => !item.isAuto)),
    [items, showNational]
  )

  const grouped = useMemo(() => {
    const next: Record<string, TimelineItem[]> = {}
    visibleItems.forEach(item => {
      const key = item.specialtyName || 'Other'
      next[key] = [...(next[key] ?? []), item]
    })
    return next
  }, [visibleItems])

  async function toggleNationalDeadlines(value: boolean) {
    setShowNational(value)
    // Merge into the caller-supplied prefs snapshot: /api/settings/profile
    // replaces the whole display_prefs object, so a bare write would drop
    // theme/accessibility choices.
    const { ok, status } = await apiFetch('/api/settings/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayPrefs: { ...displayPrefs, show_national_deadlines: value } }),
    })
    if (!ok) {
      setShowNational(!value)
      addToast(status === null ? NETWORK_ERROR_MESSAGE : 'Failed to save the NHS dates preference', 'error')
      return
    }
    router.refresh()
  }

  async function addGoal(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('goals').insert({
      user_id: user.id,
      category: goalForm.category,
      target_count: Number(goalForm.target_count) || 1,
      due_date: goalForm.due_date,
      specialty_application_id: goalForm.specialty_application_id || null,
      specific: goalForm.specific.trim() || null,
      measurable: goalForm.measurable.trim() || null,
      achievable: goalForm.achievable.trim() || null,
      relevant: goalForm.relevant.trim() || null,
      time_bound: goalForm.time_bound.trim() || null,
      start_date: iso(new Date()),
    })
    if (error) {
      addToast('Failed to add goal', 'error')
      return
    }
    addToast('Goal added', 'success')
    setShowGoalForm(false)
    setGoalForm({
      category: 'custom',
      target_count: '1',
      due_date: iso(new Date()),
      specialty_application_id: '',
      specific: '',
      measurable: '',
      achievable: '',
      relevant: '',
      time_bound: '',
    })
    router.refresh()
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const specialty = specialties.find(row => row.key === eventForm.source_specialty_key)
    const { error } = await supabase.from('deadlines').insert({
      user_id: user.id,
      title: eventForm.title.trim(),
      due_date: eventForm.due_date,
      details: eventForm.details.trim() || null,
      location: eventForm.location.trim() || null,
      completed: false,
      is_auto: false,
      source_specialty_key: specialty?.key ?? null,
    })
    if (error) {
      addToast('Failed to add event', 'error')
      return
    }
    addToast('Event added', 'success')
    setShowEventForm(false)
    setEventForm({ title: '', due_date: iso(new Date()), details: '', location: '', source_specialty_key: '' })
    router.refresh()
  }

  async function completeSelectedItem() {
    if (!selectedItem) return
    if (selectedItem.type === 'goal') {
      await supabase.from('goals').update({ completed_at: new Date().toISOString() }).eq('id', selectedItem.id.replace('goal-', ''))
    } else if (!selectedItem.isAuto) {
      await supabase.from('deadlines').update({ completed: true }).eq('id', selectedItem.id.replace('deadline-', ''))
    }
    addToast(selectedItem.type === 'goal' ? 'Goal completed' : 'Deadline completed', 'success')
    setSelectedItem(null)
    router.refresh()
  }

  async function deleteSelectedItem() {
    if (!selectedItem || selectedItem.isAuto) return
    if (!confirm(`Delete this ${selectedItem.type}?`)) return
    await supabase.from(selectedItem.type === 'goal' ? 'goals' : 'deadlines').delete().eq('id', selectedItem.id.replace(`${selectedItem.type}-`, ''))
    addToast(selectedItem.type === 'goal' ? 'Goal deleted' : 'Deadline deleted', 'success')
    setSelectedItem(null)
    router.refresh()
  }

  async function copyText(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCalendarFallbackUrl(null)
      addToast(successMessage, 'success')
      return true
    } catch {
      setCalendarFallbackUrl(text)
      addToast('Clipboard unavailable. Select the feed URL below.', 'error')
      return false
    }
  }

  async function copyCalendarFeed() {
    // Always resolve to a usable feed URL: reuse the in-memory token, generate
    // one on first use, or — because the stored token is hash-only and shown
    // once — rotate to a fresh link if it can no longer be re-surfaced. This
    // mirrors the Apple/Outlook and Google handoffs so "Copy feed" never
    // dead-ends, and copyText writes the actual URL to the clipboard (BUG-011).
    const url = await ensureCalendarFeedUrl()
    if (!url) return
    await copyText(url, 'Calendar feed link copied')
  }

  async function rotateCalendarFeed(copy = true) {
    const { ok, status, data } = await apiFetch<{ token?: string; error?: string }>('/api/calendar/feed-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rotate: true }),
    })
    if (!ok || !data?.token) {
      addToast(status === null ? NETWORK_ERROR_MESSAGE : (data?.error ?? 'Failed to rotate calendar feed'), 'error')
      return null
    }
    setCalendarToken(data.token)
    setHasCalendarFeed(true)
    const url = `${window.location.origin}/api/calendar/feed/${data.token}`
    if (copy) {
      await copyText(url, 'New calendar feed link copied')
    }
    return url
  }

  async function ensureCalendarFeedUrl() {
    let token = calendarToken
    if (!token) {
      const { ok, status, data } = await apiFetch<{ token?: string; error?: string; requiresRotation?: boolean }>('/api/calendar/feed-token', { method: 'POST' })
      if (data?.requiresRotation) {
        const rotated = await rotateCalendarFeed(false)
        return rotated
      }
      if (!ok || !data?.token) {
        addToast(status === null ? NETWORK_ERROR_MESSAGE : (data?.error ?? 'Failed to create calendar feed'), 'error')
        return null
      }
      token = data.token
      setCalendarToken(token)
      setHasCalendarFeed(true)
    }
    return `${window.location.origin}/api/calendar/feed/${token}`
  }

  async function openCalendarFeed() {
    const url = await ensureCalendarFeedUrl()
    if (!url) return
    window.location.href = url.replace(/^https?:/, 'webcal:')
  }

  async function openGoogleCalendar() {
    const url = await ensureCalendarFeedUrl()
    if (!url) return
    setCalendarFallbackUrl(url)
    // Google's add-by-URL flow only opens the "Add this calendar?" subscription
    // dialog when `cid` is a webcal:// feed URL; passing the https:// URL just
    // dropped the user on their calendar with nothing added (REG-003).
    const webcalUrl = url.replace(/^https?:/, 'webcal:')
    window.open(`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`, '_blank', 'noopener,noreferrer')
    addToast('Opened Google Calendar. If it cannot subscribe automatically, use the feed URL shown below.', 'success')
  }

  const days = monthGridDays(month)

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Timeline</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Goals (personal targets you set) and deadlines (applications and ARCP - dates that can&apos;t slip). Auto-loaded items come from your tracked specialties.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="hidden sm:flex rounded-lg border border-white/[0.08] bg-[var(--bg-surface)] p-1">
            {(['calendar', 'list'] as const).map(mode => (
              <button key={mode} onClick={() => setView(mode)} className={`min-h-[36px] px-3 rounded-md text-sm capitalize ${view === mode ? 'bg-white/[0.08] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{mode}</button>
            ))}
          </div>
          <div className="relative" onKeyDown={e => { if (e.key === 'Escape') setSyncMenuOpen(false) }}>
            <button
              onClick={() => setSyncMenuOpen(open => !open)}
              aria-haspopup="menu"
              aria-expanded={syncMenuOpen}
              className="min-h-[44px] border border-white/[0.08] bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium rounded-xl px-4 py-2.5 text-sm"
            >
              Sync to calendar
            </button>
            {syncMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setSyncMenuOpen(false)} />
                <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-raised)] p-2 shadow-lg">
                  <p className="px-3 py-2 text-xs text-[var(--text-muted)]">
                    Subscribe your calendar app to your deadlines and goals. It stays up to date automatically.
                  </p>
                  <button role="menuitem" onClick={() => { setSyncMenuOpen(false); openGoogleCalendar() }} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                    Google Calendar
                  </button>
                  <button role="menuitem" onClick={() => { setSyncMenuOpen(false); openCalendarFeed() }} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                    Apple Calendar / Outlook
                  </button>
                  <button role="menuitem" onClick={() => { setSyncMenuOpen(false); copyCalendarFeed() }} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                    Copy feed URL
                  </button>
                  {hasCalendarFeed && (
                    <button role="menuitem" onClick={() => { setSyncMenuOpen(false); rotateCalendarFeed() }} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                      Rotate feed link
                      <span className="mt-0.5 block text-xs text-[var(--text-muted)]">Creates a new link; the old one stops working.</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          <button onClick={() => setShowEventForm(true)} className="min-h-[44px] border border-white/[0.08] bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium rounded-xl px-4 py-2.5 text-sm">Add event</button>
          <button onClick={() => setShowGoalForm(true)} className="min-h-[44px] bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] text-[var(--button-primary-text)] font-semibold rounded-xl px-4 py-2.5 text-sm">Add goal</button>
        </div>
      </div>

      {calendarFallbackUrl && (
        <div className="mb-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
          <p className="text-sm font-medium text-[var(--warning)]">Calendar feed URL</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Select and copy this URL if your browser or calendar app cannot use the copy or handoff button.</p>
          <input
            readOnly
            value={calendarFallbackUrl}
            onFocus={event => event.currentTarget.select()}
            className="mt-3 w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)]"
          />
        </div>
      )}

      {showNational && banner}

      {filterBar}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={showNational}
            onChange={e => toggleNationalDeadlines(e.target.checked)}
          />
          Show NHS national recruitment dates
          <span className="text-xs text-[var(--text-muted)]">(auto-loaded from the current recruitment round)</span>
        </label>
      </div>

      <div className="sm:hidden mb-4">
        <select value={view} onChange={e => setView(e.target.value as 'calendar' | 'list')} className="w-full min-h-[44px] bg-[var(--bg-surface)] border border-white/[0.08] rounded-lg px-3 text-[var(--text-primary)]">
          <option value="list">List</option>
          <option value="calendar">Calendar</option>
        </select>
      </div>

      {view === 'calendar' ? (
        <section className={`${mounted ? '' : 'hidden sm:block'} bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl overflow-hidden`}>
          <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="min-h-[44px] px-3 text-[var(--text-secondary)]">Previous</button>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h2>
            <div className="flex items-center">
              <button onClick={() => { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)) }} className="min-h-[44px] px-3 text-sm text-[var(--text-secondary)]">Today</button>
              <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="min-h-[44px] px-3 text-[var(--text-secondary)]">Next</button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-white/[0.08] text-xs text-[var(--text-secondary)]">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <div key={day} className="p-2 text-center sm:p-3 sm:text-left">{day}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map(day => {
              const dayIso = iso(day)
              const dayItems = visibleItems.filter(item => item.date === dayIso)
              const muted = monthKey(day) !== monthKey(month)
              const isToday = todayIso === dayIso
              return (
                <div
                  key={day.toISOString()}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedDayIso(dayIso)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDayIso(dayIso) } }}
                  className={`min-h-20 sm:min-h-28 cursor-pointer border-r border-b border-white/[0.06] p-1 sm:p-2 hover:bg-[var(--bg-hover)] ${muted ? 'bg-black/10' : ''}`}
                >
                  <p className="text-xs mb-2 text-[var(--text-secondary)]">
                    {isToday ? (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 font-semibold text-[var(--text-on-accent)]">{day.getDate()}</span>
                    ) : (
                      day.getDate()
                    )}
                  </p>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={e => { e.stopPropagation(); setSelectedItem(item) }}
                        className={`block w-full truncate rounded px-2 py-1 text-left text-[11px] ${item.type === 'goal' ? 'border bg-transparent text-[var(--text-primary)]' : 'text-white'}`}
                        style={item.type === 'goal'
                          ? { borderColor: item.specialtyApplicationId ? colourBySpecialty[item.specialtyApplicationId] : 'var(--cat-neutral-dot)' }
                          : { backgroundColor: item.specialtyApplicationId ? colourBySpecialty[item.specialtyApplicationId] : 'var(--cat-neutral-dot)' }}
                      >
                        {item.title}
                      </button>
                    ))}
                    {dayItems.length > 3 && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setSelectedDayIso(dayIso) }}
                        className="block w-full rounded px-2 py-0.5 text-left text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        +{dayItems.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {(specialties.length > 0 || visibleItems.length > 0) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.08] p-3 text-xs text-[var(--text-secondary)]">
              {specialties.map(specialty => (
                <span key={specialty.id} className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colourBySpecialty[specialty.id] }} />
                  {specialty.name}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--cat-neutral-dot)' }} />
                Other
              </span>
              <span className="ml-auto inline-flex items-center gap-3 text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: 'var(--cat-neutral-dot)' }} />
                  Deadline
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-4 rounded-sm border" style={{ borderColor: 'var(--cat-neutral-dot)' }} />
                  Goal
                </span>
              </span>
            </div>
          )}
        </section>
      ) : (
        <TimelineList grouped={grouped} colourBySpecialty={colourBySpecialty} onSelectItem={setSelectedItem} todayIso={todayIso} />
      )}

      {/* Pre-hydration the view is 'calendar' but the calendar grid is hidden on
          mobile; show the list there until the effect resolves the real view, so
          mobile users never see a blank/flashing timeline on first paint. */}
      {view === 'calendar' && !mounted && <div className="sm:hidden"><TimelineList grouped={grouped} colourBySpecialty={colourBySpecialty} onSelectItem={setSelectedItem} todayIso={todayIso} /></div>}

      {showGoalForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <form onSubmit={addGoal} className="w-full sm:max-w-md bg-[var(--bg-surface)] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add goal</h2>
            <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-emphasis)]">
              Portfolio category
              <select value={goalForm.category} onChange={e => setGoalForm(f => ({ ...f, category: e.target.value }))} className="mt-1.5 w-full min-h-[44px] bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3 text-sm text-[var(--text-primary)]">
                {CATEGORIES.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
              </select>
            </label>
            <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-emphasis)]">
              Target count
              <input type="number" min="1" value={goalForm.target_count} onChange={e => setGoalForm(f => ({ ...f, target_count: e.target.value }))} className="mt-1.5 w-full min-h-[44px] bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3 text-sm text-[var(--text-primary)]" />
            </label>
            <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-emphasis)]">
              Due date
              <input type="date" value={goalForm.due_date} onChange={e => setGoalForm(f => ({ ...f, due_date: e.target.value }))} className="mt-1.5 w-full min-h-[44px] bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3 text-sm text-[var(--text-primary)]" />
            </label>
            <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-emphasis)]">
              Related specialty
              <select value={goalForm.specialty_application_id} onChange={e => setGoalForm(f => ({ ...f, specialty_application_id: e.target.value }))} className="mt-1.5 w-full min-h-[44px] bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3 text-sm text-[var(--text-primary)]">
                <option value="">Other</option>
                {specialties.map(specialty => <option key={specialty.id} value={specialty.id}>{specialty.name}</option>)}
              </select>
            </label>
            <div className="space-y-2 rounded-xl border border-white/[0.08] bg-[var(--bg-canvas)] p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-emphasis)]">SMART detail</p>
              {[
                ['specific', 'Specific: what exactly will you complete?'],
                ['measurable', 'Measurable: how will you know it is done?'],
                ['achievable', 'Achievable: what makes it realistic?'],
                ['relevant', 'Relevant: why does it matter now?'],
                ['time_bound', 'Time-bound: what is the checkpoint?'],
              ].map(([key, placeholder]) => (
                <input
                  key={key}
                  value={goalForm[key as keyof typeof goalForm]}
                  onChange={e => setGoalForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full min-h-[40px] rounded-lg border border-white/[0.08] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)]"
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowGoalForm(false)} className="min-h-[44px] flex-1 border border-white/[0.08] text-[var(--text-secondary)] rounded-lg px-4 py-2.5 text-sm">Cancel</button>
              <button className="min-h-[44px] flex-1 bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] rounded-lg px-4 py-2.5 text-sm font-semibold">Add goal</button>
            </div>
          </form>
        </div>
      )}

      {showEventForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <form onSubmit={addEvent} className="w-full sm:max-w-md bg-[var(--bg-surface)] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add calendar event</h2>
            <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-emphasis)]">
              Event title
              <input required value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. IMT application deadline" className="mt-1.5 w-full min-h-[44px] bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3 text-sm text-[var(--text-primary)]" />
            </label>
            <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-emphasis)]">
              Date
              <input type="date" value={eventForm.due_date} onChange={e => setEventForm(f => ({ ...f, due_date: e.target.value }))} className="mt-1.5 w-full min-h-[44px] bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3 text-sm text-[var(--text-primary)]" />
            </label>
            <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-emphasis)]">
              Location or link
              <input value={eventForm.location} onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Oriel, MS Teams, Royal College website" className="mt-1.5 w-full min-h-[44px] bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3 text-sm text-[var(--text-primary)]" />
            </label>
            <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-emphasis)]">
              Details
              <textarea value={eventForm.details} onChange={e => setEventForm(f => ({ ...f, details: e.target.value }))} placeholder="What needs to happen before this date?" rows={4} className="mt-1.5 w-full bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)]" />
            </label>
            <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-emphasis)]">
              Related specialty
              <select value={eventForm.source_specialty_key} onChange={e => setEventForm(f => ({ ...f, source_specialty_key: e.target.value }))} className="mt-1.5 w-full min-h-[44px] bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3 text-sm text-[var(--text-primary)]">
                <option value="">Other</option>
                {specialties.map(specialty => <option key={specialty.id} value={specialty.key}>{specialty.name}</option>)}
              </select>
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowEventForm(false)} className="min-h-[44px] flex-1 border border-white/[0.08] text-[var(--text-secondary)] rounded-lg px-4 py-2.5 text-sm">Cancel</button>
              <button className="min-h-[44px] flex-1 bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] rounded-lg px-4 py-2.5 text-sm font-semibold">Add event</button>
            </div>
          </form>
        </div>
      )}

      {selectedDayIso && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={() => setSelectedDayIso(null)}>
          <div className="w-full sm:max-w-md bg-[var(--bg-surface)] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {new Date(selectedDayIso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h2>
              <button type="button" onClick={() => setSelectedDayIso(null)} className="min-h-[36px] px-3 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">Close</button>
            </div>
            <div className="mt-4 space-y-2">
              {visibleItems.filter(item => item.date === selectedDayIso).map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setSelectedDayIso(null); setSelectedItem(item) }}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-[var(--bg-canvas)] px-4 py-3 text-left hover:border-white/[0.14]"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.specialtyApplicationId ? colourBySpecialty[item.specialtyApplicationId] : 'var(--cat-neutral-dot)' }} />
                  <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-primary)]">{item.title}</span>
                  <span className={`text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 border ${item.type === 'goal' ? 'border-emerald-500/20 bg-emerald-500/10 text-[var(--success)]' : 'border-amber-400/20 bg-amber-400/10 text-[var(--warning)]'}`}>{item.type}</span>
                </button>
              ))}
              {visibleItems.filter(item => item.date === selectedDayIso).length === 0 && (
                <p className="rounded-xl border border-white/[0.06] bg-[var(--bg-canvas)] px-4 py-3 text-sm text-[var(--text-muted)]">Nothing scheduled on this day.</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setEventForm(f => ({ ...f, due_date: selectedDayIso })); setSelectedDayIso(null); setShowEventForm(true) }}
              className="mt-5 min-h-[44px] w-full rounded-xl bg-[var(--button-primary-bg)] px-4 text-sm font-semibold text-[var(--button-primary-text)] hover:bg-[var(--button-primary-bg-hover)]"
            >
              Add event on this date
            </button>
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-[var(--bg-surface)] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--text-emphasis)]">{selectedItem.type}</p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{selectedItem.title}</h2>
              </div>
              <button type="button" onClick={() => setSelectedItem(null)} className="min-h-[36px] px-3 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">Close</button>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              <div>
                <dt className="text-xs text-[var(--text-secondary)]">Date</dt>
                <dd className="text-[var(--text-primary)]">{new Date(selectedItem.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--text-secondary)]">Group</dt>
                <dd className="text-[var(--text-primary)]">{selectedItem.specialtyName}</dd>
              </div>
              {(selectedItem.location || selectedItem.details) && (
                <div>
                  <dt className="text-xs text-[var(--text-secondary)]">Details</dt>
                  <dd className="whitespace-pre-line text-[var(--text-secondary)]">{[selectedItem.location, selectedItem.details].filter(Boolean).join('\n\n')}</dd>
                </div>
              )}
            </dl>
            {selectedItem.sourceUrl && (
              <a
                href={selectedItem.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-[44px] items-center rounded-xl bg-[var(--button-primary-bg)] px-5 text-sm font-semibold text-[var(--button-primary-text)] hover:bg-[var(--button-primary-bg-hover)]"
              >
                Open {selectedItem.sourceLabel ?? 'source'}
              </a>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {(selectedItem.type === 'goal' || !selectedItem.isAuto) && (
                <button
                  type="button"
                  onClick={completeSelectedItem}
                  className="min-h-[44px] rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 text-sm font-medium text-[var(--success)]"
                >
                  Mark complete
                </button>
              )}
              {!selectedItem.isAuto && (
                <button
                  type="button"
                  onClick={deleteSelectedItem}
                  className="min-h-[44px] rounded-xl border border-red-500/20 bg-red-500/10 px-4 text-sm font-medium text-[var(--danger)]"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TimelineList({ grouped, colourBySpecialty, onSelectItem, todayIso }: { grouped: Record<string, TimelineItem[]>; colourBySpecialty: Record<string, string>; onSelectItem: (item: TimelineItem) => void; todayIso: string | null }) {
  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([group, groupItems]) => (
        <section key={group} className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{group}</h2>
          <div className="space-y-2">
            {groupItems.map(item => {
              const overdue = Boolean(todayIso && item.date < todayIso)
              return (
              <button key={item.id} type="button" onClick={() => onSelectItem(item)} className="flex w-full items-center gap-3 rounded-xl bg-[var(--bg-canvas)] border border-white/[0.06] px-4 py-3 text-left hover:border-white/[0.14]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.specialtyApplicationId ? colourBySpecialty[item.specialtyApplicationId] : 'var(--cat-neutral-dot)' }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[var(--text-primary)]">{item.title}</p>
                  <p className={`text-xs ${overdue ? 'font-medium text-[var(--danger)]' : 'text-[var(--text-secondary)]'}`}>
                    {new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {overdue ? ' - overdue' : ''}
                  </p>
                  {(item.location || item.details) && (
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{[item.location, item.details].filter(Boolean).join(' - ')}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 border ${item.type === 'goal' ? 'border-emerald-500/20 bg-emerald-500/10 text-[var(--success)]' : 'border-amber-400/20 bg-amber-400/10 text-[var(--warning)]'}`}>{item.type}</span>
                  {item.isAuto && (
                    <span className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 border border-white/[0.08] bg-white/[0.04] text-[var(--text-emphasis)]" title="Auto-loaded from your tracked specialty">Auto</span>
                  )}
                </div>
              </button>
              )
            })}
          </div>
        </section>
      ))}
      {Object.keys(grouped).length === 0 && (
        <div className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-10 text-center">
          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Nothing on your timeline yet</p>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
            Track a specialty to auto-load application deadlines, or click &quot;Add goal&quot; to set your own targets (e.g. &quot;Complete 3 audits by end of FY1&quot;).
          </p>
        </div>
      )}
    </div>
  )
}
