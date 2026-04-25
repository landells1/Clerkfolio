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
}

function urgency(due: string): { label: string; cls: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(due)
  d.setHours(0, 0, 0, 0)
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return { label: 'Overdue', cls: 'text-red-400' }
  if (diff === 0) return { label: 'Today', cls: 'text-amber-400' }
  if (diff === 1) return { label: 'Tomorrow', cls: 'text-amber-400' }
  if (diff <= 7) return { label: `${diff}d`, cls: 'text-amber-300' }
  if (diff <= 30) return { label: `${diff}d`, cls: 'text-[rgba(245,245,242,0.45)]' }
  return { label: `${diff}d`, cls: 'text-[rgba(245,245,242,0.3)]' }
}

export default function DeadlinesWidget({ initialDeadlines }: { initialDeadlines: Deadline[] }) {
  const [deadlines, setDeadlines] = useState<Deadline[]>(initialDeadlines)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()
  const { addToast } = useToast()

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
      setDeadlines(prev => [...prev, data].sort((a, b) => a.due_date.localeCompare(b.due_date)))
      setTitle('')
      setDate(new Date().toISOString().split('T')[0])
      setAdding(false)
      startTransition(() => router.refresh())
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    // Optimistically remove
    const previous = deadlines
    setDeadlines(prev => prev.filter(d => d.id !== id))

    const { error } = await supabase.from('deadlines').delete().eq('id', id)
    if (error) {
      setDeadlines(previous)
      addToast('Failed to delete deadline', 'error')
      return
    }
    startTransition(() => router.refresh())
  }

  async function handleComplete(id: string) {
    // Optimistically remove from view
    const previous = deadlines
    setDeadlines(prev => prev.filter(d => d.id !== id))

    const { error } = await supabase.from('deadlines').update({ completed: true }).eq('id', id)
    if (error) {
      setDeadlines(previous)
      addToast('Failed to mark deadline complete', 'error')
      return
    }
    startTransition(() => router.refresh())
  }

  function startEdit(d: Deadline) {
    setEditingId(d.id)
    setEditTitle(d.title)
    setEditDate(d.due_date)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditTitle('')
    setEditDate('')
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
      setDeadlines(prev =>
        prev
          .map(d => d.id === id ? { ...d, title: editTitle.trim(), due_date: editDate } : d)
          .sort((a, b) => a.due_date.localeCompare(b.due_date))
      )
      cancelEdit()
      startTransition(() => router.refresh())
    }
    setEditSaving(false)
  }

  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <h3 className="text-sm font-semibold text-[#F5F5F2]">Upcoming deadlines</h3>
        <button
          onClick={() => setAdding(v => !v)}
          className="text-xs text-[#1B6FD9] hover:text-[#3884DD] transition-colors font-medium"
        >
          {adding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="p-4 border-b border-white/[0.06] space-y-3">
          <input
            autoFocus
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Portfolio submission"
            className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1B6FD9] transition-colors"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="flex-1 bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9] transition-colors"
            />
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="px-4 py-2 bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-50 text-[#0B0B0C] text-sm font-semibold rounded-lg transition-colors"
            >
              {saving ? '…' : 'Save'}
            </button>
          </div>
        </form>
      )}

      <div className="divide-y divide-white/[0.04] max-h-64 overflow-y-auto">
        {deadlines.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[rgba(245,245,242,0.3)]">No deadlines yet</p>
          </div>
        ) : (
          deadlines.map(d => {
            const { label, cls } = urgency(d.due_date)
            const formatted = new Date(d.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

            if (editingId === d.id) {
              return (
                <form
                  key={d.id}
                  onSubmit={e => handleEditSave(e, d.id)}
                  className="px-4 py-3 space-y-2"
                >
                  <input
                    autoFocus
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1B6FD9] transition-colors"
                  />
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={editDate}
                      onChange={e => setEditDate(e.target.value)}
                      className="flex-1 bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9] transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={editSaving || !editTitle.trim()}
                      className="px-3 py-1.5 bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-50 text-[#0B0B0C] text-xs font-semibold rounded-lg transition-colors"
                    >
                      {editSaving ? '…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-3 py-1.5 border border-white/[0.08] text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] text-xs rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )
            }

            return (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3 group">
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm text-[rgba(245,245,242,0.85)] truncate cursor-pointer hover:text-[#F5F5F2] transition-colors"
                    onClick={() => startEdit(d)}
                  >
                    {d.title}
                  </p>
                  <p className="text-xs text-[rgba(245,245,242,0.35)] font-mono">{formatted}</p>
                </div>
                <span className={`text-xs font-mono font-medium shrink-0 ${cls}`}>{label}</span>
                <button
                  onClick={() => handleComplete(d.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-[rgba(245,245,242,0.25)] hover:text-[#1B6FD9] transition-all"
                  title="Mark complete"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-[rgba(245,245,242,0.3)] hover:text-red-400 transition-all"
                  title="Delete"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
