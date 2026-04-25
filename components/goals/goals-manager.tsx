'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Goal = {
  id: string
  category: string
  target_count: number
  due_date: string | null
}

type Props = {
  initialGoals: Goal[]
}

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'audit_qip',   label: 'Audit & QIP' },
  { value: 'teaching',    label: 'Teaching' },
  { value: 'conference',  label: 'Conference' },
  { value: 'publication', label: 'Publication' },
  { value: 'leadership',  label: 'Leadership' },
  { value: 'prize',       label: 'Prize' },
  { value: 'procedure',   label: 'Procedure' },
  { value: 'reflection',  label: 'Reflection' },
  { value: 'case',        label: 'Cases' },
]

function formatDueDate(dateStr: string | null): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T12:00:00Z')
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isDueSoon(dateStr: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr + 'T12:00:00Z')
  const diff = d.getTime() - Date.now()
  return diff >= 0 && diff < 30 * 24 * 60 * 60 * 1000
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr + 'T12:00:00Z').getTime() < Date.now()
}

export default function GoalsManager({ initialGoals }: Props) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals)
  const [showAddForm, setShowAddForm] = useState(false)
  const [category, setCategory] = useState('audit_qip')
  const [targetCount, setTargetCount] = useState(5)
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function handleAdd() {
    setError(null)
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not logged in'); return }

      const { data, error: insertError } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          category,
          target_count: targetCount,
          due_date: dueDate || null,
        })
        .select('id, category, target_count, due_date')
        .single()

      if (insertError) { setError(insertError.message); return }
      if (data) {
        setGoals(prev => [...prev, data])
        setShowAddForm(false)
        setCategory('audit_qip')
        setTargetCount(5)
        setDueDate('')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const goal = goals.find(g => g.id === id)
    const label = CATEGORY_OPTIONS.find(o => o.value === goal?.category)?.label ?? 'this goal'
    if (!window.confirm(`Remove "${label}"? This cannot be undone.`)) return

    setDeletingId(id)
    const { error: deleteError } = await supabase.from('goals').delete().eq('id', id)
    if (deleteError) {
      setError('Failed to remove goal. Please try again.')
    } else {
      setGoals(prev => prev.filter(g => g.id !== id))
    }
    setDeletingId(null)
  }

  const LABEL = 'block text-xs text-[rgba(245,245,242,0.5)] mb-1.5'
  const INPUT = 'w-full bg-[#0B0B0C] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9] transition-colors'

  return (
    <div className="space-y-4">
      {goals.length === 0 && !showAddForm && (
        <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 text-center">
          <p className="text-sm text-[rgba(245,245,242,0.4)] mb-3">No goals set yet.</p>
        </div>
      )}

      {goals.length > 0 && (
        <div className="bg-[#141416] border border-white/[0.08] rounded-2xl divide-y divide-white/[0.04]">
          {goals.map(goal => {
            const catLabel = CATEGORY_OPTIONS.find(o => o.value === goal.category)?.label ?? goal.category
            const dueFmt = formatDueDate(goal.due_date)
            const overdue = isOverdue(goal.due_date)
            const soon = isDueSoon(goal.due_date)
            return (
              <div key={goal.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm text-[#F5F5F2]">{catLabel}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-[rgba(245,245,242,0.4)]">Target: {goal.target_count}</p>
                    {dueFmt && (
                      <p className={`text-xs ${overdue ? 'text-red-400' : soon ? 'text-amber-400' : 'text-[rgba(245,245,242,0.35)]'}`}>
                        Due {dueFmt}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(goal.id)}
                  disabled={deletingId === goal.id}
                  className="text-xs text-[rgba(245,245,242,0.3)] hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {deletingId === goal.id ? 'Removing…' : 'Remove'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showAddForm ? (
        <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5 space-y-4">
          <p className="text-sm font-semibold text-[#F5F5F2]">Add goal</p>

          <div>
            <label className={LABEL}>Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className={INPUT}
            >
              {CATEGORY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL}>Target count</label>
            <input
              type="number"
              min={1}
              max={500}
              value={targetCount}
              onChange={e => setTargetCount(Math.max(1, Math.min(500, Number(e.target.value))))}
              className={INPUT}
            />
          </div>

          <div>
            <label className={LABEL}>
              Due date <span className="normal-case font-normal text-[rgba(245,245,242,0.3)]">(optional)</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className={INPUT + ' [color-scheme:dark]'}
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex-1 bg-[#1B6FD9] hover:bg-[#3884DD] disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              {saving ? 'Saving…' : 'Add goal'}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setError(null) }}
              className="px-4 py-2 text-sm text-[rgba(245,245,242,0.5)] hover:text-[#F5F5F2] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full bg-[#141416] border border-white/[0.08] hover:border-white/[0.14] rounded-2xl px-5 py-3 text-sm text-[rgba(245,245,242,0.5)] hover:text-[#F5F5F2] transition-all text-left"
        >
          + Add a goal
        </button>
      )}
    </div>
  )
}
