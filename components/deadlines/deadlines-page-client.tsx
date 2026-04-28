'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast-provider'

type Deadline = {
  id: string
  title: string
  due_date: string
  completed: boolean
  is_auto?: boolean
  source_specialty_key?: string | null
}

function urgencyInfo(due: string): { label: string; cls: string; days: number } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(due)
  d.setHours(0, 0, 0, 0)
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, cls: 'text-red-400 bg-red-400/10 border-red-400/20', days: diff }
  if (diff === 0) return { label: 'Today', cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20', days: diff }
  if (diff === 1) return { label: 'Tomorrow', cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20', days: diff }
  if (diff <= 7) return { label: `${diff}d`, cls: 'text-amber-300 bg-amber-300/10 border-amber-300/20', days: diff }
  if (diff <= 30) return { label: `${diff}d`, cls: 'text-[rgba(245,245,242,0.5)] bg-white/[0.04] border-white/[0.08]', days: diff }
  return { label: `${diff}d`, cls: 'text-[rgba(245,245,242,0.3)] bg-white/[0.03] border-white/[0.06]', days: diff }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

const INPUT = 'w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1B6FD9] transition-colors'

export default function DeadlinesPageClient({
  initialUpcoming,
  initialCompleted,
}: {
  initialUpcoming: Deadline[]
  initialCompleted: Deadline[]
}) {
  const supabase = createClient()
  const router = useRouter()
  const { addToast } = useToast()
  const [, startTransition] = useTransition()

  const [upcoming, setUpcoming] = useState<Deadline[]>(initialUpcoming)
  const [completed, setCompleted] = useState<Deadline[]>(initialCompleted)
  const [showCompleted, setShowCompleted] = useState(false)

  // Add form
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { data, error } = await supabase
      .from('deadlines')
      .insert({ user_id: user.id, title: title.trim(), due_date: date, completed: false })
      .select()
      .single()

    if (error) {
      addToast('Failed to add deadline', 'error')
    } else if (data) {
      setUpcoming(prev => [...prev, data].sort((a, b) => a.due_date.localeCompare(b.due_date)))
      setTitle('')
      setDate(new Date().toISOString().split('T')[0])
      setAdding(false)
      startTransition(() => router.refresh())
    }
    setSaving(false)
  }

  async function handleComplete(id: string) {
    const item = upcoming.find(d => d.id === id)
    if (!item) return
    setUpcoming(prev => prev.filter(d => d.id !== id))
    setCompleted(prev => [{ ...item, completed: true }, ...prev])

    const { error } = await supabase.from('deadlines').update({ completed: true }).eq('id', id)
    if (error) {
      setUpcoming(prev => [...prev, item].sort((a, b) => a.due_date.localeCompare(b.due_date)))
      setCompleted(prev => prev.filter(d => d.id !== id))
      addToast('Failed to mark complete', 'error')
    } else {
      startTransition(() => router.refresh())
    }
  }

  async function handleUncomplete(id: string) {
    const item = completed.find(d => d.id === id)
    if (!item) return
    setCompleted(prev => prev.filter(d => d.id !== id))
    setUpcoming(prev => [...prev, { ...item, completed: false }].sort((a, b) => a.due_date.localeCompare(b.due_date)))

    const { error } = await supabase.from('deadlines').update({ completed: false }).eq('id', id)
    if (error) {
      setCompleted(prev => [item, ...prev])
      setUpcoming(prev => prev.filter(d => d.id !== id))
      addToast('Failed to reopen deadline', 'error')
    } else {
      startTransition(() => router.refresh())
    }
  }

  async function handleDelete(id: string, isCompleted: boolean) {
    if (isCompleted) {
      setCompleted(prev => prev.filter(d => d.id !== id))
    } else {
      setUpcoming(prev => prev.filter(d => d.id !== id))
    }
    const { error } = await supabase.from('deadlines').delete().eq('id', id)
    if (error) {
      addToast('Failed to delete deadline', 'error')
      startTransition(() => router.refresh())
    }
  }

  function startEdit(d: Deadline) {
    setEditingId(d.id)
    setEditTitle(d.title)
    setEditDate(d.due_date)
  }

  async function handleEditSave(e: React.FormEvent, id: string) {
    e.preventDefault()
    if (!editTitle.trim()) return
    setEditSaving(true)

    const { error } = await supabase
      .from('deadlines')
      .update({ title: editTitle.trim(), due_date: editDate })
      .eq('id', id)

    if (error) {
      addToast('Failed to update deadline', 'error')
    } else {
      setUpcoming(prev =>
        prev.map(d => d.id === id ? { ...d, title: editTitle.trim(), due_date: editDate } : d)
          .sort((a, b) => a.due_date.localeCompare(b.due_date))
      )
      setEditingId(null)
      startTransition(() => router.refresh())
    }
    setEditSaving(false)
  }

  const autoDeadlines = upcoming.filter(d => d.is_auto)
  const manualUpcoming = upcoming.filter(d => !d.is_auto)
  const overdue = manualUpcoming.filter(d => urgencyInfo(d.due_date).days < 0)
  const active = manualUpcoming.filter(d => urgencyInfo(d.due_date).days >= 0)

  return (
    <div className="space-y-4">
      {/* Add button / form */}
      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center gap-2 px-4 py-3 bg-[#141416] border border-dashed border-white/[0.12] rounded-xl text-sm text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] hover:border-white/[0.2] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add deadline
        </button>
      ) : (
        <form onSubmit={handleAdd} className="bg-[#141416] border border-[#1B6FD9]/30 rounded-xl p-4 space-y-3">
          <p className="text-xs font-medium text-[rgba(245,245,242,0.55)] uppercase tracking-wide">New deadline</p>
          <input
            autoFocus
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. IMT application deadline"
            className={INPUT}
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={`${INPUT} flex-1`}
            />
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="px-4 py-2.5 bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-50 text-[#0B0B0C] text-sm font-semibold rounded-lg transition-colors"
            >
              {saving ? '…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setTitle('') }}
              className="px-4 py-2.5 border border-white/[0.08] text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Application windows (auto-deadlines) */}
      {autoDeadlines.length > 0 && (
        <Section title="Application windows" count={autoDeadlines.length} accent="blue">
          {autoDeadlines.map(d => {
            const { label, cls } = urgencyInfo(d.due_date)
            return (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3.5 group hover:bg-white/[0.02] transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B6FD9" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[rgba(245,245,242,0.85)] truncate">{d.title}</p>
                  <p className="text-xs text-[rgba(245,245,242,0.35)] font-mono mt-0.5">{formatDate(d.due_date)}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 ${cls}`}>{label}</span>
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#1B6FD9]/10 text-[#1B6FD9] border border-[#1B6FD9]/20 shrink-0">auto</span>
              </div>
            )
          })}
          <p className="px-4 py-2 text-[10px] text-[rgba(245,245,242,0.3)] border-t border-white/[0.04]">
            These dates are managed by your specialty trackers. Remove a specialty to remove its deadlines.
          </p>
        </Section>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <Section title="Overdue" count={overdue.length} accent="red">
          {overdue.map(d => (
            <DeadlineRow
              key={d.id}
              d={d}
              editingId={editingId}
              editTitle={editTitle}
              editDate={editDate}
              editSaving={editSaving}
              onEdit={startEdit}
              onEditTitleChange={setEditTitle}
              onEditDateChange={setEditDate}
              onEditSave={handleEditSave}
              onEditCancel={() => setEditingId(null)}
              onComplete={() => handleComplete(d.id)}
              onDelete={() => handleDelete(d.id, false)}
            />
          ))}
        </Section>
      )}

      {/* Upcoming */}
      <Section title="Upcoming" count={active.length}>
        {active.length === 0 ? (
          <p className="text-sm text-[rgba(245,245,242,0.3)] text-center py-8">
            No upcoming deadlines — add one above
          </p>
        ) : (
          active.map(d => (
            <DeadlineRow
              key={d.id}
              d={d}
              editingId={editingId}
              editTitle={editTitle}
              editDate={editDate}
              editSaving={editSaving}
              onEdit={startEdit}
              onEditTitleChange={setEditTitle}
              onEditDateChange={setEditDate}
              onEditSave={handleEditSave}
              onEditCancel={() => setEditingId(null)}
              onComplete={() => handleComplete(d.id)}
              onDelete={() => handleDelete(d.id, false)}
            />
          ))
        )}
      </Section>

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(v => !v)}
            className="flex items-center gap-2 text-xs text-[rgba(245,245,242,0.4)] hover:text-[rgba(245,245,242,0.7)] transition-colors mb-2"
          >
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform ${showCompleted ? 'rotate-90' : ''}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {showCompleted ? 'Hide' : 'Show'} completed ({completed.length})
          </button>

          {showCompleted && (
            <Section title="Completed" count={completed.length} muted>
              {completed.map(d => (
                <div key={d.id} className="flex items-center gap-3 px-4 py-3 group opacity-50 hover:opacity-70 transition-opacity">
                  <button
                    onClick={() => handleUncomplete(d.id)}
                    title="Reopen"
                    className="shrink-0 w-4 h-4 rounded border border-[#1B6FD9] bg-[#1B6FD9] flex items-center justify-center hover:bg-[#155BB0] transition-colors"
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0B0B0C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[rgba(245,245,242,0.6)] line-through truncate">{d.title}</p>
                    <p className="text-xs text-[rgba(245,245,242,0.3)] font-mono">{formatDate(d.due_date)}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(d.id, true)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-[rgba(245,245,242,0.3)] hover:text-red-400 transition-all"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, count, accent, muted, children }: {
  title: string; count: number; accent?: 'red' | 'blue'; muted?: boolean; children: React.ReactNode
}) {
  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl overflow-hidden">
      <div className={`flex items-center justify-between px-4 py-3 border-b border-white/[0.06] ${accent === 'red' ? 'bg-red-500/5' : accent === 'blue' ? 'bg-[#1B6FD9]/5' : ''}`}>
        <h2 className={`text-xs font-semibold uppercase tracking-wider ${
          accent === 'red' ? 'text-red-400' : accent === 'blue' ? 'text-[#1B6FD9]' : muted ? 'text-[rgba(245,245,242,0.35)]' : 'text-[rgba(245,245,242,0.55)]'
        }`}>
          {title}
        </h2>
        <span className={`text-xs font-mono ${accent === 'red' ? 'text-red-400' : accent === 'blue' ? 'text-[#1B6FD9]' : 'text-[rgba(245,245,242,0.3)]'}`}>
          {count}
        </span>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {children}
      </div>
    </div>
  )
}

function DeadlineRow({
  d, editingId, editTitle, editDate, editSaving,
  onEdit, onEditTitleChange, onEditDateChange, onEditSave, onEditCancel,
  onComplete, onDelete,
}: {
  d: Deadline
  editingId: string | null
  editTitle: string
  editDate: string
  editSaving: boolean
  onEdit: (d: Deadline) => void
  onEditTitleChange: (v: string) => void
  onEditDateChange: (v: string) => void
  onEditSave: (e: React.FormEvent, id: string) => void
  onEditCancel: () => void
  onComplete: () => void
  onDelete: () => void
}) {
  const { label, cls } = urgencyInfo(d.due_date)
  const INPUT = 'bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9] transition-colors'

  if (editingId === d.id) {
    return (
      <form onSubmit={e => onEditSave(e, d.id)} className="px-4 py-3 space-y-2">
        <input
          autoFocus
          type="text"
          value={editTitle}
          onChange={e => onEditTitleChange(e.target.value)}
          className={`w-full ${INPUT}`}
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={editDate}
            onChange={e => onEditDateChange(e.target.value)}
            className={`flex-1 ${INPUT}`}
          />
          <button
            type="submit"
            disabled={editSaving || !editTitle.trim()}
            className="px-3 py-2 bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-50 text-[#0B0B0C] text-xs font-semibold rounded-lg transition-colors"
          >
            {editSaving ? '…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onEditCancel}
            className="px-3 py-2 border border-white/[0.08] text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] text-xs rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 group hover:bg-white/[0.02] transition-colors">
      {/* Complete button */}
      <button
        onClick={onComplete}
        title="Mark complete"
        className="shrink-0 w-4 h-4 rounded border border-white/[0.2] bg-transparent hover:border-[#1B6FD9] hover:bg-[#1B6FD9]/10 flex items-center justify-center transition-colors"
      />

      {/* Content */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onEdit(d)}
      >
        <p className="text-sm text-[rgba(245,245,242,0.85)] truncate hover:text-[#F5F5F2] transition-colors">{d.title}</p>
        <p className="text-xs text-[rgba(245,245,242,0.35)] font-mono mt-0.5">{formatDate(d.due_date)}</p>
      </div>

      {/* Urgency badge */}
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 ${cls}`}>
        {label}
      </span>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-[rgba(245,245,242,0.3)] hover:text-red-400 transition-all"
        title="Delete"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
