'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/lib/types/portfolio'
import { useToast } from '@/components/ui/toast-provider'

export type TimelineGoal = {
  id: string
  category: string
  target_count: number
  due_date: string | null
  specialty_application_id: string | null
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
  type: 'deadline' | 'goal'
  specialtyApplicationId: string | null
  specialtyName: string
}

const COLOURS = ['#1B6FD9', '#0EA5E9', '#14B8A6', '#22C55E', '#F59E0B', '#EF4444', '#A855F7', '#EC4899']

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`
}

function iso(date: Date) {
  return date.toISOString().split('T')[0]
}

function monthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(first)
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7))
  return Array.from({ length: 42 }, (_, index) => {
    const d = new Date(start)
    d.setDate(start.getDate() + index)
    return d
  })
}

export function TimelineClient({ goals, specialties, deadlines, calendarFeedToken }: { goals: TimelineGoal[]; specialties: TimelineSpecialty[]; deadlines: TimelineSpecialtyDeadline[]; calendarFeedToken: string | null }) {
  const supabase = createClient()
  const router = useRouter()
  const { addToast } = useToast()
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [month, setMonth] = useState(new Date())
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [showEventForm, setShowEventForm] = useState(false)
  const [goalForm, setGoalForm] = useState({ category: 'custom', target_count: '1', due_date: iso(new Date()), specialty_application_id: '' })
  const [eventForm, setEventForm] = useState({ title: '', due_date: iso(new Date()), details: '', location: '', source_specialty_key: '' })
  const [calendarToken, setCalendarToken] = useState(calendarFeedToken)

  const colourBySpecialty = useMemo(() => Object.fromEntries(specialties.map((specialty, index) => [specialty.id, COLOURS[index % COLOURS.length]])), [specialties])

  const items: TimelineItem[] = useMemo(() => {
    const goalItems = goals
      .filter(goal => goal.due_date)
      .map(goal => {
        const specialty = specialties.find(row => row.id === goal.specialty_application_id)
        return {
          id: `goal-${goal.id}`,
          title: `${goal.target_count} ${goal.category.replace(/_/g, ' ')}`,
          date: goal.due_date!,
          details: null,
          location: null,
          type: 'goal' as const,
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
      type: 'deadline' as const,
      specialtyApplicationId: deadline.specialtyApplicationId,
      specialtyName: deadline.specialtyName,
    }))
    return [...deadlineItems, ...goalItems].sort((a, b) => a.date.localeCompare(b.date))
  }, [deadlines, goals, specialties])

  const grouped = useMemo(() => {
    const next: Record<string, TimelineItem[]> = {}
    items.forEach(item => {
      const key = item.specialtyName || 'Other'
      next[key] = [...(next[key] ?? []), item]
    })
    return next
  }, [items])

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
      start_date: iso(new Date()),
    })
    if (error) {
      addToast('Failed to add goal', 'error')
      return
    }
    addToast('Goal added', 'success')
    setShowGoalForm(false)
    router.refresh()
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const specialty = specialties.find(row => row.id === eventForm.source_specialty_key)
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

  async function copyCalendarFeed() {
    let token = calendarToken
    if (!token) {
      const res = await fetch('/api/calendar/feed-token', { method: 'POST' })
      const body = await res.json()
      if (!res.ok || !body.token) {
        addToast(body.error ?? 'Failed to create calendar feed', 'error')
        return
      }
      token = body.token
      setCalendarToken(token)
    }
    const url = `${window.location.origin}/api/calendar/feed/${token}`
    await navigator.clipboard.writeText(url)
    addToast('Calendar feed link copied', 'success')
  }

  const days = monthDays(month)

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Timeline</h1>
          <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">Goals and application deadlines in one place.</p>
        </div>
        <div className="flex gap-2">
          <div className="hidden sm:flex rounded-lg border border-white/[0.08] bg-[#141416] p-1">
            {(['calendar', 'list'] as const).map(mode => (
              <button key={mode} onClick={() => setView(mode)} className={`min-h-[36px] px-3 rounded-md text-sm capitalize ${view === mode ? 'bg-white/[0.08] text-[#F5F5F2]' : 'text-[rgba(245,245,242,0.45)]'}`}>{mode}</button>
            ))}
          </div>
          <button onClick={copyCalendarFeed} className="min-h-[44px] border border-white/[0.08] bg-[#141416] text-[#F5F5F2] font-medium rounded-xl px-4 py-2.5 text-sm">Calendar feed</button>
          <button onClick={() => setShowEventForm(true)} className="min-h-[44px] border border-white/[0.08] bg-[#141416] text-[#F5F5F2] font-medium rounded-xl px-4 py-2.5 text-sm">Add event</button>
          <button onClick={() => setShowGoalForm(true)} className="min-h-[44px] bg-[#1B6FD9] hover:bg-[#155BB0] text-[#0B0B0C] font-semibold rounded-xl px-4 py-2.5 text-sm">Add goal</button>
        </div>
      </div>

      <div className="sm:hidden mb-4">
        <select value={view} onChange={e => setView(e.target.value as 'calendar' | 'list')} className="w-full min-h-[44px] bg-[#141416] border border-white/[0.08] rounded-lg px-3 text-[#F5F5F2]">
          <option value="list">List</option>
          <option value="calendar">Calendar</option>
        </select>
      </div>

      {view === 'calendar' ? (
        <section className="hidden sm:block bg-[#141416] border border-white/[0.08] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="min-h-[44px] px-3 text-[rgba(245,245,242,0.65)]">Previous</button>
            <h2 className="text-lg font-semibold text-[#F5F5F2]">{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h2>
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="min-h-[44px] px-3 text-[rgba(245,245,242,0.65)]">Next</button>
          </div>
          <div className="grid grid-cols-7 border-b border-white/[0.08] text-xs text-[rgba(245,245,242,0.35)]">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <div key={day} className="p-3">{day}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map(day => {
              const dayItems = items.filter(item => item.date === iso(day))
              const muted = monthKey(day) !== monthKey(month)
              return (
                <div key={day.toISOString()} className={`min-h-28 border-r border-b border-white/[0.06] p-2 ${muted ? 'bg-black/10' : ''}`}>
                  <p className={`text-xs mb-2 ${muted ? 'text-[rgba(245,245,242,0.2)]' : 'text-[rgba(245,245,242,0.5)]'}`}>{day.getDate()}</p>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map(item => (
                      <div key={item.id} className="truncate rounded px-2 py-1 text-[11px] text-white" style={{ backgroundColor: item.specialtyApplicationId ? colourBySpecialty[item.specialtyApplicationId] : '#6B7280' }}>
                        {item.title}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : (
        <TimelineList grouped={grouped} colourBySpecialty={colourBySpecialty} />
      )}

      {view === 'calendar' && <div className="sm:hidden"><TimelineList grouped={grouped} colourBySpecialty={colourBySpecialty} /></div>}

      {showGoalForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <form onSubmit={addGoal} className="w-full sm:max-w-md bg-[#141416] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#F5F5F2]">Add goal</h2>
            <select value={goalForm.category} onChange={e => setGoalForm(f => ({ ...f, category: e.target.value }))} className="w-full min-h-[44px] bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3 text-[#F5F5F2]">
              {CATEGORIES.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
            </select>
            <input type="number" min="1" value={goalForm.target_count} onChange={e => setGoalForm(f => ({ ...f, target_count: e.target.value }))} className="w-full min-h-[44px] bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3 text-[#F5F5F2]" />
            <input type="date" value={goalForm.due_date} onChange={e => setGoalForm(f => ({ ...f, due_date: e.target.value }))} className="w-full min-h-[44px] bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3 text-[#F5F5F2]" />
            <select value={goalForm.specialty_application_id} onChange={e => setGoalForm(f => ({ ...f, specialty_application_id: e.target.value }))} className="w-full min-h-[44px] bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3 text-[#F5F5F2]">
              <option value="">Other</option>
              {specialties.map(specialty => <option key={specialty.id} value={specialty.id}>{specialty.name}</option>)}
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowGoalForm(false)} className="min-h-[44px] flex-1 border border-white/[0.08] text-[rgba(245,245,242,0.65)] rounded-lg px-4 py-2.5 text-sm">Cancel</button>
              <button className="min-h-[44px] flex-1 bg-[#1B6FD9] text-[#0B0B0C] rounded-lg px-4 py-2.5 text-sm font-semibold">Add goal</button>
            </div>
          </form>
        </div>
      )}

      {showEventForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <form onSubmit={addEvent} className="w-full sm:max-w-md bg-[#141416] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#F5F5F2]">Add calendar event</h2>
            <input required value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title" className="w-full min-h-[44px] bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3 text-[#F5F5F2]" />
            <input type="date" value={eventForm.due_date} onChange={e => setEventForm(f => ({ ...f, due_date: e.target.value }))} className="w-full min-h-[44px] bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3 text-[#F5F5F2]" />
            <input value={eventForm.location} onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))} placeholder="Location or link" className="w-full min-h-[44px] bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3 text-[#F5F5F2]" />
            <textarea value={eventForm.details} onChange={e => setEventForm(f => ({ ...f, details: e.target.value }))} placeholder="Details" rows={4} className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[#F5F5F2]" />
            <select value={eventForm.source_specialty_key} onChange={e => setEventForm(f => ({ ...f, source_specialty_key: e.target.value }))} className="w-full min-h-[44px] bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3 text-[#F5F5F2]">
              <option value="">Other</option>
              {specialties.map(specialty => <option key={specialty.id} value={specialty.id}>{specialty.name}</option>)}
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowEventForm(false)} className="min-h-[44px] flex-1 border border-white/[0.08] text-[rgba(245,245,242,0.65)] rounded-lg px-4 py-2.5 text-sm">Cancel</button>
              <button className="min-h-[44px] flex-1 bg-[#1B6FD9] text-[#0B0B0C] rounded-lg px-4 py-2.5 text-sm font-semibold">Add event</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function TimelineList({ grouped, colourBySpecialty }: { grouped: Record<string, TimelineItem[]>; colourBySpecialty: Record<string, string> }) {
  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([group, groupItems]) => (
        <section key={group} className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[#F5F5F2] mb-3">{group}</h2>
          <div className="space-y-2">
            {groupItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl bg-[#0B0B0C] border border-white/[0.06] px-4 py-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.specialtyApplicationId ? colourBySpecialty[item.specialtyApplicationId] : '#6B7280' }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[#F5F5F2]">{item.title}</p>
                  <p className="text-xs text-[rgba(245,245,242,0.35)]">{new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  {(item.location || item.details) && (
                    <p className="mt-1 line-clamp-2 text-xs text-[rgba(245,245,242,0.42)]">{[item.location, item.details].filter(Boolean).join(' - ')}</p>
                  )}
                </div>
                <span className="text-[10px] uppercase tracking-wide text-[rgba(245,245,242,0.35)]">{item.type}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
      {Object.keys(grouped).length === 0 && (
        <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-10 text-center text-sm text-[rgba(245,245,242,0.45)]">No timeline items yet</div>
      )}
    </div>
  )
}
