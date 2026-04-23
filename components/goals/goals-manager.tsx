'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Goal = {
  id: string
  category: string
  target_count: number
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

export default function GoalsManager({ initialGoals }: Props) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals)
  const [showAddForm, setShowAddForm] = useState(false)
  const [category, setCategory] = useState('audit_qip')
  const [targetCount, setTargetCount] = useState(5)
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
        .insert({ user_id: user.id, category, target_count: targetCount })
        .select('id, category, target_count')
        .single()

      if (insertError) { setError(insertError.message); return }
      if (data) {
        setGoals(prev => [...prev, data])
        setShowAddForm(false)
        setCategory('audit_qip')
        setTargetCount(5)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const { error: deleteError } = await supabase.from('goals').delete().eq('id', id)
    if (!deleteError) {
      setGoals(prev => prev.filter(g => g.id !== id))
    }
    setDeletingId(null)
  }

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
            return (
              <div key={goal.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm text-[#F5F5F2]">{catLabel}</p>
                  <p className="text-xs text-[rgba(245,245,242,0.4)] mt-0.5">Target: {goal.target_count}</p>
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
            <label className="block text-xs text-[rgba(245,245,242,0.5)] mb-1.5">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-[#0B0B0C] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1D9E75] transition-colors"
            >
              {CATEGORY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[rgba(245,245,242,0.5)] mb-1.5">Target count</label>
            <input
              type="number"
              min={1}
              max={500}
              value={targetCount}
              onChange={e => setTargetCount(Math.max(1, Math.min(500, Number(e.target.value))))}
              className="w-full bg-[#0B0B0C] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1D9E75] transition-colors"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex-1 bg-[#1D9E75] hover:bg-[#22c693] disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
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
